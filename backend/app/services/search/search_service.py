"""Document + medical-data search.

Documents are the universal searchable surface: extracted_text already
contains everything OCR'd/extracted from a document (test names, medicine
names, hospital names, ...), so a single ILIKE/full-text query across
filename + extracted_text covers "HbA1c", "Metformin", "Apollo Hospital",
etc. without needing a join across every medical table.

Uses Postgres full-text search (to_tsvector/plainto_tsquery) when running on
Postgres, and falls back to ILIKE on SQLite (used in tests/local dev) since
SQLite has no tsvector support. No vector database - not needed at this
scale, per the project brief.
"""
from datetime import date
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.enums import DocumentType


def search_documents(
    db: Session,
    *,
    vault_id: str,
    query: Optional[str] = None,
    document_type: Optional[DocumentType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
):
    q = db.query(Document).filter(Document.vault_id == vault_id, Document.is_deleted.is_(False))

    if document_type:
        q = q.filter(Document.document_type == document_type)
    if date_from:
        q = q.filter(Document.document_date >= date_from)
    if date_to:
        q = q.filter(Document.document_date <= date_to)

    if query:
        dialect = db.bind.dialect.name if db.bind is not None else ""
        if dialect == "postgresql":
            tsquery = func.plainto_tsquery("english", query)
            tsvector = func.to_tsvector(
                "english", func.coalesce(Document.extracted_text, "") + " " + Document.original_filename
            )
            q = q.filter(tsvector.op("@@")(tsquery))
        else:
            like = f"%{query}%"
            q = q.filter(or_(Document.extracted_text.ilike(like), Document.original_filename.ilike(like)))

    total = q.count()
    results = q.order_by(Document.document_date.desc().nullslast()).offset(offset).limit(limit).all()
    return results, total
