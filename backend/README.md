# Health Vault — Backend

A personal digital health-document vault: upload medical documents (prescriptions, lab reports,
bills, scans, discharge summaries, ...), and an AI pipeline turns them into structured, searchable
data — a chronological health timeline, tracked medical expenses, and doctor-facing health
summaries — while the original document always stays available as the source of truth.

Modular monolith, FastAPI + PostgreSQL + SQLAlchemy + Alembic. Storage, OCR and LLM providers are
all swappable via `.env` without touching application code.

## Architecture

```
React frontend (not in this repo)
        │ REST API (/api/v1)
        ▼
   FastAPI app  ──────────────┬──────────────┬───────────────
        │                     │              │
   PostgreSQL            File Storage     AI Layer (OCR + LLM)
  (structured data)     (local | S3)    (pluggable providers)
```

Upload flow:

```
POST /documents/upload
   → file saved to storage, Document row created (status=UPLOADED)
   → 201 returned immediately with the document id
   → BackgroundTask runs the pipeline:
     OCR → Classification → Extraction → Normalization → Validation
         → structured tables (prescriptions/labs/diagnoses/reports)
         → Timeline events
         → Expense extraction (for bills)
   → status becomes PROCESSED or NEEDS_REVIEW (low confidence / failed validation)
```

Every structured row (a `LabResult`, a `Medicine`, a `MedicalExpense`, ...) carries a
`document_id` back to its source `Document`, so nothing is presented without a traceable origin.
`processing_logs` records every pipeline stage (status + confidence) for debugging.

See `app/services/pipeline/` for the pipeline stages, `app/services/ai/` for the OCR/LLM provider
abstractions, and `app/services/sharing/access_service.py` for the authorization model.

## Folder structure

```
app/
  api/v1/        one router per resource (auth, vault, documents, timeline, expenses, ...)
  models/        SQLAlchemy models (one file per domain area)
  schemas/       Pydantic request/response schemas
  services/
    storage/     local disk / S3 provider abstraction
    ai/ocr/      OCR provider abstraction (tesseract | none)
    ai/llm/      classification+extraction+summary provider abstraction (rule_based | openai)
    pipeline/    OCR → classify → extract → normalize → validate → persist orchestration
    timeline/    builds timeline_events from persisted structured records
    expenses/    bill → expense extraction, manual entry, summary aggregation
    sharing/     access control (access_service.py) + share management
    summaries/   builds structured doctor context and generates the health summary
    search/      document search (Postgres full-text, ILIKE fallback on sqlite)
  core/          config, JWT/password security, logging, FastAPI dependencies
  db/            SQLAlchemy engine/session, declarative base
migrations/      Alembic
tests/           pytest suite (services + API + access-control)
```

## Quickstart (Docker)

```bash
cp .env.example .env          # edit JWT_SECRET_KEY at minimum
docker compose up --build
```

The API is at `http://localhost:8000`, interactive docs at `http://localhost:8000/docs`.
Migrations run automatically on container start (`alembic upgrade head`).

## Quickstart (local, no Docker)

Requires Python 3.11+ and a running PostgreSQL instance (or use SQLite for a quick spin, see below).

```bash
python -m venv .venv
source .venv/bin/activate        # .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env             # set DATABASE_URL / JWT_SECRET_KEY

alembic upgrade head
uvicorn app.main:app --reload
```

To try it without installing PostgreSQL, set `DATABASE_URL=sqlite:///./dev.db` in `.env` — the
models use portable column types and run on both.

## Zero-config AI providers (no API keys required)

By default:

- `AI_PROVIDER=rule_based` — keyword/regex-based classification and extraction. No API key,
  works out of the box, intentionally conservative (documents with weak signal are flagged
  `NEEDS_REVIEW` rather than guessed at).
- `OCR_PROVIDER=tesseract` — digital PDFs are read directly via `pypdf` first; Tesseract OCR only
  kicks in for scanned PDFs/images. Requires the `tesseract-ocr` binary (already installed in the
  Docker image). Set `OCR_PROVIDER=none` to skip OCR entirely and only read digital PDF text.

For real language understanding, set `AI_PROVIDER=openai` and `OPENAI_API_KEY=...` — the
classification, extraction and doctor-summary prompts switch over automatically; nothing else in
the codebase changes (see `app/services/ai/llm/`).

## Storage providers

`STORAGE_PROVIDER=local` (default, writes under `STORAGE_LOCAL_DIR`) or `STORAGE_PROVIDER=s3`
(set `STORAGE_BUCKET` + credentials). Documents are never served from a public URL — every
download goes through `GET /documents/{id}/download`, which re-checks authorization first.

## Authentication & access model

JWT access + refresh tokens (`app/core/security.py`). Every vault/document endpoint goes through
`app/services/sharing/access_service.py`:

- Vault **owner** or a `vault_members` row with role `OWNER`/`FAMILY_MEMBER`: full read/write
  access to that vault's documents, timeline, expenses, prescriptions, labs, diagnoses, search.
- A `shared_access` grant (role `DOCTOR`/`VIEWER`, created via `POST /sharing`): read-only access
  to `/documents` and `/summaries`, scoped to the granted `allowed_document_types` and/or specific
  `document_ids` — never the whole vault. This is the doctor-sharing model from the spec: a doctor
  only sees what was explicitly shared, and the owner can revoke or expire it at any time
  (`DELETE /sharing/{id}`, `expires_at`).

Timeline/expenses/search stay scoped to full vault members for this MVP — a doctor works from the
shared documents plus the generated health summary (`GET /summaries/doctor/{vault_id}`), not the
owner's raw timeline. This is a deliberate MVP scoping decision, documented in
`access_service.py`.

## Doctor health summary

`POST /summaries/generate?vault_id=...` pulls structured facts already in Postgres (known
conditions, recent lab results, current medications, recent consultations, recent events, recent
expenses — see `summary_service.build_structured_context`) and hands them, with source document
references, to the configured LLM provider to turn into prose. It never re-reads original PDFs and
is instructed not to state anything beyond what the structured facts contain.

## Running tests

```bash
pip install -r requirements-dev.txt   # adds reportlab, used only to synthesize test PDFs
pytest
```

The suite runs against a temp SQLite DB with `AI_PROVIDER=rule_based` / `OCR_PROVIDER=none`, so it
needs no external services or API keys. Covers: auth, vault/document access isolation, the full
upload→OCR→classify→extract→normalize→validate→timeline pipeline, doctor category-sharing, and
expense tracking.

## Database migrations

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Enum-like fields (`document_type`, `processing_status`, `validation_status`, ...) are stored as
plain `VARCHAR` via `app.db.base_class.enum_column`, not a native/CHECK-constrained DB enum —
adding a new `DocumentType` or `ExpenseCategory` value is a Python-only change, not a migration.

## What's deliberately out of scope for this MVP

- Background processing uses FastAPI `BackgroundTasks`, not Celery — `process_document(document_id)`
  in `app/services/pipeline/processing_service.py` opens its own DB session and takes only an id,
  so moving it to a Celery task later is a call-site change, not a redesign.
- No vector database — Postgres full-text search (ILIKE fallback on SQLite) is enough at this
  scale, per the project brief.
- No push/email notifications for share invites or processing completion.
- Token revocation is not implemented (stateless short-lived JWTs); add a denylist if immediate
  invalidation is required.
