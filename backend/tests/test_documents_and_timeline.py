import io
import time

import pytest
from fastapi.testclient import TestClient

reportlab = pytest.importorskip("reportlab", reason="reportlab only needed to synthesize test PDFs")
from reportlab.pdfgen import canvas  # noqa: E402


def _make_pdf(lines: list[str]) -> io.BytesIO:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    for i, line in enumerate(lines):
        c.drawString(50, 800 - i * 20, line)
    c.save()
    buf.seek(0)
    return buf


LAB_REPORT_LINES = [
    "Patient Name: John Doe",
    "Doctor: Dr. Smith",
    "Laboratory: Apollo Diagnostics",
    "Report Date: 15/08/2026",
    "HbA1c 7.2 % (4.0-5.6)",
    "Glucose 145 mg/dL (70-110)",
]


def _upload_lab_report(client: TestClient, headers: dict, vault_id: str) -> dict:
    files = {"file": ("lab_report.pdf", _make_pdf(LAB_REPORT_LINES), "application/pdf")}
    r = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": headers["Authorization"]},
        data={"vault_id": vault_id},
        files=files,
    )
    assert r.status_code == 201, r.text
    document_id = r.json()["id"]

    for _ in range(30):
        r = client.get(f"/api/v1/documents/{document_id}", headers={"Authorization": headers["Authorization"]})
        if r.json()["processing_status"] in ("PROCESSED", "NEEDS_REVIEW", "FAILED"):
            break
        time.sleep(0.1)
    return r.json()


def test_upload_lab_report_is_classified_and_processed(client: TestClient, auth_headers: dict, vault_id: str):
    document = _upload_lab_report(client, auth_headers, vault_id)
    assert document["document_type"] == "LAB_REPORT"
    assert document["processing_status"] == "PROCESSED"


def test_processing_logs_cover_every_stage(client: TestClient, auth_headers: dict, vault_id: str):
    document = _upload_lab_report(client, auth_headers, vault_id)
    r = client.get(
        f"/api/v1/documents/{document['id']}/logs", headers={"Authorization": auth_headers["Authorization"]}
    )
    stages = [log["stage"] for log in r.json()]
    for expected in ("UPLOAD", "OCR", "CLASSIFICATION", "EXTRACTION", "VALIDATION", "TIMELINE"):
        assert expected in stages


def test_lab_report_generates_timeline_event(client: TestClient, auth_headers: dict, vault_id: str):
    _upload_lab_report(client, auth_headers, vault_id)
    r = client.get(
        "/api/v1/timeline", headers={"Authorization": auth_headers["Authorization"]}, params={"vault_id": vault_id}
    )
    events = r.json()
    assert len(events) == 1
    assert events[0]["event_type"] == "LAB_TEST"


def test_search_finds_document_by_content(client: TestClient, auth_headers: dict, vault_id: str):
    _upload_lab_report(client, auth_headers, vault_id)
    r = client.get(
        "/api/v1/search", headers={"Authorization": auth_headers["Authorization"]},
        params={"vault_id": vault_id, "q": "Apollo"},
    )
    assert r.json()["total"] == 1


def test_document_download_requires_ownership(client: TestClient, auth_headers: dict, vault_id: str):
    document = _upload_lab_report(client, auth_headers, vault_id)

    other = client.post(
        "/api/v1/auth/register",
        json={"email": "intruder@example.com", "password": "supersecret123", "full_name": "Intruder"},
    )
    other_token = other.json()["access_token"]

    r = client.get(
        f"/api/v1/documents/{document['id']}/download", headers={"Authorization": f"Bearer {other_token}"}
    )
    assert r.status_code == 404


def test_lab_report_lookup_by_document_id(client: TestClient, auth_headers: dict, vault_id: str):
    document = _upload_lab_report(client, auth_headers, vault_id)
    headers = {"Authorization": auth_headers["Authorization"]}

    r = client.get(
        "/api/v1/labs", headers=headers, params={"vault_id": vault_id, "document_id": document["id"]}
    )
    assert r.status_code == 200
    reports = r.json()
    assert len(reports) == 1
    assert reports[0]["document_id"] == document["id"]


def test_dashboard_reports_storage_used(client: TestClient, auth_headers: dict, vault_id: str):
    document = _upload_lab_report(client, auth_headers, vault_id)
    r = client.get(
        f"/api/v1/vault/{vault_id}/dashboard", headers={"Authorization": auth_headers["Authorization"]}
    )
    dashboard = r.json()
    assert dashboard["storage_used_bytes"] > 0
    assert dashboard["document_count"] == 1
    assert dashboard["documents_by_type"].get("LAB_REPORT") == 1


def test_delete_document_soft_deletes(client: TestClient, auth_headers: dict, vault_id: str):
    document = _upload_lab_report(client, auth_headers, vault_id)
    headers = {"Authorization": auth_headers["Authorization"]}

    r = client.delete(f"/api/v1/documents/{document['id']}", headers=headers)
    assert r.status_code == 204

    r = client.get(f"/api/v1/documents/{document['id']}", headers=headers)
    assert r.status_code == 404
