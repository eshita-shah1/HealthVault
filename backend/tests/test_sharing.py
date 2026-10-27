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


def _register(client: TestClient, email: str) -> dict:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "full_name": email.split("@")[0]},
    )
    assert r.status_code == 201
    return r.json()


def _upload_and_wait(client: TestClient, token: str, vault_id: str, lines: list[str], filename: str) -> dict:
    files = {"file": (filename, _make_pdf(lines), "application/pdf")}
    r = client.post(
        "/api/v1/documents/upload", headers={"Authorization": f"Bearer {token}"},
        data={"vault_id": vault_id}, files=files,
    )
    assert r.status_code == 201, r.text
    document_id = r.json()["id"]
    for _ in range(30):
        r = client.get(f"/api/v1/documents/{document_id}", headers={"Authorization": f"Bearer {token}"})
        if r.json()["processing_status"] in ("PROCESSED", "NEEDS_REVIEW", "FAILED"):
            break
        time.sleep(0.1)
    return r.json()


def test_doctor_only_sees_shared_category(client: TestClient):
    patient = _register(client, "patient_share@example.com")
    doctor = _register(client, "doctor_share@example.com")
    patient_token = patient["access_token"]

    vault_id = client.get(
        "/api/v1/vault", headers={"Authorization": f"Bearer {patient_token}"}
    ).json()[0]["id"]

    lab_doc = _upload_and_wait(
        client, patient_token, vault_id,
        ["Patient Name: X", "Doctor: Dr. A", "Laboratory: Lab", "Report Date: 01/01/2026",
         "HbA1c 7.2 % (4.0-5.6)"],
        "lab.pdf",
    )
    bill_doc = _upload_and_wait(
        client, patient_token, vault_id,
        ["Hospital: City Hospital", "Bill No: 123", "Bill Date: 01/01/2026", "Total Amount: Rs. 5000"],
        "bill.pdf",
    )

    # Before sharing, the doctor has no access at all.
    r = client.get(
        "/api/v1/documents", headers={"Authorization": f"Bearer {doctor['access_token']}"},
        params={"vault_id": vault_id},
    )
    assert r.status_code == 404

    # Owner shares only LAB_REPORT category with the doctor.
    r = client.post(
        "/api/v1/sharing", headers={"Authorization": f"Bearer {patient_token}"},
        params={"vault_id": vault_id},
        json={"shared_with_email": "doctor_share@example.com", "role": "DOCTOR", "allowed_document_types": ["LAB_REPORT"]},
    )
    assert r.status_code == 201, r.text

    r = client.get(
        "/api/v1/documents", headers={"Authorization": f"Bearer {doctor['access_token']}"},
        params={"vault_id": vault_id},
    )
    assert r.status_code == 200
    doc_ids = {d["id"] for d in r.json()}
    assert lab_doc["id"] in doc_ids
    assert bill_doc["id"] not in doc_ids

    # Doctor can fetch the shared lab document directly...
    r = client.get(
        f"/api/v1/documents/{lab_doc['id']}", headers={"Authorization": f"Bearer {doctor['access_token']}"}
    )
    assert r.status_code == 200

    # ...but not the un-shared bill.
    r = client.get(
        f"/api/v1/documents/{bill_doc['id']}", headers={"Authorization": f"Bearer {doctor['access_token']}"}
    )
    assert r.status_code == 404


def test_revoked_share_removes_access(client: TestClient):
    patient = _register(client, "patient_revoke@example.com")
    doctor = _register(client, "doctor_revoke@example.com")
    patient_token = patient["access_token"]
    vault_id = client.get(
        "/api/v1/vault", headers={"Authorization": f"Bearer {patient_token}"}
    ).json()[0]["id"]

    r = client.post(
        "/api/v1/sharing", headers={"Authorization": f"Bearer {patient_token}"},
        params={"vault_id": vault_id},
        json={"shared_with_email": "doctor_revoke@example.com", "role": "DOCTOR", "allowed_document_types": ["LAB_REPORT"]},
    )
    share_id = r.json()["id"]

    r = client.get(
        "/api/v1/sharing/shared-with-me", headers={"Authorization": f"Bearer {doctor['access_token']}"}
    )
    assert len(r.json()) == 1

    r = client.delete(f"/api/v1/sharing/{share_id}", headers={"Authorization": f"Bearer {patient_token}"})
    assert r.status_code == 204

    r = client.get(
        "/api/v1/sharing/shared-with-me", headers={"Authorization": f"Bearer {doctor['access_token']}"}
    )
    assert len(r.json()) == 0


def test_only_owner_can_create_share(client: TestClient):
    patient = _register(client, "patient_owneronly@example.com")
    family = _register(client, "family_owneronly@example.com")
    patient_token = patient["access_token"]
    vault_id = client.get(
        "/api/v1/vault", headers={"Authorization": f"Bearer {patient_token}"}
    ).json()[0]["id"]

    client.post(
        f"/api/v1/vault/{vault_id}/members", headers={"Authorization": f"Bearer {patient_token}"},
        json={"email": "family_owneronly@example.com", "role": "FAMILY_MEMBER"},
    )

    r = client.post(
        "/api/v1/sharing", headers={"Authorization": f"Bearer {family['access_token']}"},
        params={"vault_id": vault_id},
        json={"shared_with_email": "someone@example.com", "role": "VIEWER"},
    )
    assert r.status_code == 404
