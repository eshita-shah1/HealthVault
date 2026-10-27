import os
import tempfile

import pytest

os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("AI_PROVIDER", "rule_based")
os.environ.setdefault("OCR_PROVIDER", "none")
os.environ.setdefault("STORAGE_PROVIDER", "local")

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"

_upload_dir = tempfile.mkdtemp()
os.environ["STORAGE_LOCAL_DIR"] = _upload_dir

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402

Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def auth_headers(client: TestClient) -> dict:
    import uuid

    email = f"user_{uuid.uuid4().hex[:10]}@example.com"
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "full_name": "Test User"},
    )
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "_email": email, "_user": r.json()["user"]}


@pytest.fixture()
def vault_id(client: TestClient, auth_headers: dict) -> str:
    r = client.get("/api/v1/vault", headers={"Authorization": auth_headers["Authorization"]})
    assert r.status_code == 200
    return r.json()[0]["id"]
