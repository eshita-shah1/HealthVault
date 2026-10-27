import io
import os
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.base_class import new_uuid
from app.db.session import get_db
from app.models.document import Document, ProcessingLog
from app.models.enums import DocumentType, LogStatus, ProcessingStage, ProcessingStatus
from app.models.user import User
from app.schemas.document import DocumentDetailOut, DocumentOut, ProcessingLogOut
from app.services.pipeline.processing_service import process_document
from app.services.sharing.access_service import (
    accessible_document_filter,
    require_document_access,
    require_full_vault_access,
)
from app.services.storage.factory import get_storage_service

router = APIRouter(prefix="/documents", tags=["documents"])


def _validate_upload(file: UploadFile) -> tuple[str, bytes]:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.allowed_upload_extensions:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type '{ext}'. Allowed: {', '.join(settings.allowed_upload_extensions)}",
        )

    contents = file.file.read()
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB upload limit",
        )
    if len(contents) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")
    return ext, contents


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    background_tasks: BackgroundTasks,
    vault_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentOut:
    require_full_vault_access(db, user=user, vault_id=vault_id)

    ext, contents = _validate_upload(file)
    document_id = new_uuid()
    storage_key = f"{vault_id}/{document_id}{ext}"

    storage = get_storage_service()
    storage.save(
        file_obj=io.BytesIO(contents),
        key=storage_key,
        content_type=file.content_type or "application/octet-stream",
    )

    document = Document(
        id=document_id,
        vault_id=vault_id,
        uploaded_by=user.id,
        original_filename=file.filename or f"document{ext}",
        mime_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(contents),
        storage_provider=storage.provider_name,
        storage_path=storage_key,
        processing_status=ProcessingStatus.UPLOADED,
    )
    db.add(document)
    db.flush()
    db.add(
        ProcessingLog(
            document_id=document.id, stage=ProcessingStage.UPLOAD, status=LogStatus.SUCCESS,
            message="File stored", created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(document)

    background_tasks.add_task(process_document, document.id)
    return DocumentOut.model_validate(document)


@router.get("", response_model=list[DocumentOut])
def list_documents(
    vault_id: str = Query(...),
    document_type: Optional[DocumentType] = None,
    processing_status: Optional[ProcessingStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DocumentOut]:
    doc_filter = accessible_document_filter(db, user=user, vault_id=vault_id)
    if doc_filter is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vault not found")

    q = db.query(Document).filter(doc_filter, Document.is_deleted.is_(False))
    if document_type:
        q = q.filter(Document.document_type == document_type)
    if processing_status:
        q = q.filter(Document.processing_status == processing_status)
    if date_from:
        q = q.filter(Document.document_date >= date_from)
    if date_to:
        q = q.filter(Document.document_date <= date_to)

    documents = q.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
    return [DocumentOut.model_validate(d) for d in documents]


@router.get("/{document_id}", response_model=DocumentDetailOut)
def get_document(document_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DocumentDetailOut:
    document = require_document_access(db, user=user, document_id=document_id)
    return DocumentDetailOut.model_validate(document)


@router.get("/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = require_document_access(db, user=user, document_id=document_id)
    storage = get_storage_service()
    file_bytes = storage.read(document.storage_path)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=document.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{document.original_filename}"'},
    )


@router.get("/{document_id}/logs", response_model=list[ProcessingLogOut])
def get_document_logs(document_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ProcessingLogOut]:
    document = require_document_access(db, user=user, document_id=document_id)
    return [ProcessingLogOut.model_validate(l) for l in document.processing_logs]


@router.post("/{document_id}/reprocess", response_model=DocumentOut)
def reprocess_document(
    document_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DocumentOut:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    require_full_vault_access(db, user=user, vault_id=document.vault_id)

    document.processing_status = ProcessingStatus.UPLOADED
    db.commit()
    background_tasks.add_task(process_document, document.id)
    db.refresh(document)
    return DocumentOut.model_validate(document)


@router.patch("/{document_id}/archive", response_model=DocumentOut)
def archive_document(document_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DocumentOut:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    require_full_vault_access(db, user=user, vault_id=document.vault_id)

    document.is_archived = not document.is_archived
    db.commit()
    db.refresh(document)
    return DocumentOut.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    require_full_vault_access(db, user=user, vault_id=document.vault_id)

    document.is_deleted = True
    document.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None
