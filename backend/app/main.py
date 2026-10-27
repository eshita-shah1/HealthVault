from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import (
    auth,
    diagnoses,
    documents,
    expenses,
    labs,
    medical_reports,
    prescriptions,
    search,
    sharing,
    summaries,
    timeline,
    users,
    vault,
)
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Health Vault backend: a personal digital health-document vault with an AI "
        "document processing pipeline (OCR -> classification -> extraction -> "
        "normalization -> validation), automatic timeline & expense tracking, "
        "multi-user/family/doctor sharing, and doctor-facing health summaries."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def _http_exception_handler(request: Request, exc: HTTPException):
    return await http_exception_handler(request, exc)


@app.exception_handler(RequestValidationError)
async def _validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


API_PREFIX = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(vault.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
app.include_router(timeline.router, prefix=API_PREFIX)
app.include_router(expenses.router, prefix=API_PREFIX)
app.include_router(prescriptions.router, prefix=API_PREFIX)
app.include_router(labs.router, prefix=API_PREFIX)
app.include_router(diagnoses.router, prefix=API_PREFIX)
app.include_router(medical_reports.router, prefix=API_PREFIX)
app.include_router(sharing.router, prefix=API_PREFIX)
app.include_router(summaries.router, prefix=API_PREFIX)
app.include_router(search.router, prefix=API_PREFIX)
