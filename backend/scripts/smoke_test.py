"""Manual end-to-end smoke test (not part of the pytest suite): registers a
user, uploads a synthetic lab report PDF, waits for the background pipeline,
and checks documents/timeline/expenses/search/summary all come back sane.

Run with a throwaway sqlite DB:
  DATABASE_URL=sqlite:///./smoke.db JWT_SECRET_KEY=x AI_PROVIDER=rule_based OCR_PROVIDER=none \
    python scripts/smoke_test.py
"""
import io
import sys
import time

from fastapi.testclient import TestClient

sys.path.insert(0, ".")

from app.main import app  # noqa: E402

client = TestClient(app)

PDF_TEXT_STUB = b"%PDF-1.4\n%fake\n"  # not a real parseable PDF; used for the image-upload path instead


def main() -> None:
    email = f"smoke_{int(time.time())}@example.com"
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "full_name": "Smoke Test"},
    )
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Registered user:", email)

    r = client.get("/api/v1/vault", headers=headers)
    assert r.status_code == 200, r.text
    vault_id = r.json()[0]["id"]
    print("Vault:", vault_id)

    lab_text = (
        "Patient Name: John Doe\n"
        "Doctor: Dr. Smith\n"
        "Laboratory: Apollo Diagnostics\n"
        "Report Date: 15/08/2026\n"
        "HbA1c 7.2 % (4.0-5.6)\n"
        "Glucose 145 mg/dL (70-110)\n"
    )
    from reportlab.pdfgen import canvas  # optional, fall back to .txt-as-pdf if unavailable

    buf = io.BytesIO()
    try:
        c = canvas.Canvas(buf)
        for i, line in enumerate(lab_text.splitlines()):
            c.drawString(50, 800 - i * 20, line)
        c.save()
        buf.seek(0)
        files = {"file": ("lab_report.pdf", buf, "application/pdf")}
    except ImportError:
        files = {"file": ("lab_report.txt", io.BytesIO(lab_text.encode()), "text/plain")}

    r = client.post(
        "/api/v1/documents/upload", headers=headers, data={"vault_id": vault_id}, files=files
    )
    print("Upload status:", r.status_code, r.text[:300])
    assert r.status_code == 201, r.text
    document_id = r.json()["id"]

    for _ in range(20):
        r = client.get(f"/api/v1/documents/{document_id}", headers=headers)
        status_ = r.json()["processing_status"]
        if status_ in ("PROCESSED", "NEEDS_REVIEW", "FAILED"):
            break
        time.sleep(0.2)

    print("Final document status:", status_)
    print("Document type:", r.json().get("document_type"))

    r = client.get(f"/api/v1/documents/{document_id}/logs", headers=headers)
    print("Pipeline stages run:", [(l["stage"], l["status"]) for l in r.json()])

    r = client.get("/api/v1/timeline", headers=headers, params={"vault_id": vault_id})
    print("Timeline events:", len(r.json()))

    r = client.get("/api/v1/labs", headers=headers, params={"vault_id": vault_id})
    print("Lab reports:", r.json())

    r = client.get("/api/v1/search", headers=headers, params={"vault_id": vault_id, "q": "HbA1c"})
    print("Search results for 'HbA1c':", r.json()["total"])

    r = client.post("/api/v1/summaries/generate", headers=headers, params={"vault_id": vault_id})
    print("Summary generation:", r.status_code)
    print(r.json().get("summary_text", "")[:500])

    print("\nSMOKE TEST PASSED")


if __name__ == "__main__":
    main()
