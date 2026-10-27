"""Exercises the real running backend over actual HTTP (not TestClient) to
verify the exact contract the frontend's axios client relies on: flat token
fields on login/register, vault_id-scoped endpoints, multipart upload field
names, enum values, etc. Run against a live `uvicorn` instance.
"""
import io
import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"
API = f"{BASE}/api/v1"


def main() -> None:
    client = httpx.Client(timeout=10)
    email = f"integration_{int(time.time())}@example.com"

    print("1. Register (expects flat access_token/refresh_token/user, not nested)")
    r = client.post(f"{API}/auth/register", json={"email": email, "password": "supersecret123", "full_name": "Integration Test"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert "access_token" in body and "refresh_token" in body and "user" in body, body
    assert "tokens" not in body
    token = body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   OK:", body["user"]["email"])

    print("2. GET /users/me (there is no /auth/me)")
    r = client.get(f"{API}/users/me", headers=headers)
    assert r.status_code == 200, r.text
    print("   OK")

    print("3. GET /vault — resolve the user's own vault")
    r = client.get(f"{API}/vault", headers=headers)
    assert r.status_code == 200 and len(r.json()) == 1, r.text
    vault_id = r.json()[0]["id"]
    print("   OK vault_id =", vault_id)

    print("4. GET /vault/{id}/dashboard")
    r = client.get(f"{API}/vault/{vault_id}/dashboard", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["document_count"] == 0
    print("   OK:", r.json())

    print("5. POST /documents/upload (multipart: vault_id field + file field)")
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    for i, line in enumerate([
        "Patient Name: Jane Doe", "Doctor: Dr. Rao", "Laboratory: City Labs",
        "Report Date: 15/09/2026", "HbA1c 7.2 % (4.0-5.6)",
    ]):
        c.drawString(50, 750 - i * 20, line)
    c.save()
    buf.seek(0)
    files = {"file": ("lab.pdf", buf, "application/pdf")}
    r = client.post(f"{API}/documents/upload", headers=headers, data={"vault_id": vault_id}, files=files)
    assert r.status_code == 201, r.text
    document_id = r.json()["id"]
    print("   OK document_id =", document_id, "status =", r.json()["processing_status"])

    print("6. Poll GET /documents/{id} until terminal status")
    status = None
    for _ in range(30):
        r = client.get(f"{API}/documents/{document_id}", headers=headers)
        status = r.json()["processing_status"]
        if status in ("PROCESSED", "NEEDS_REVIEW", "FAILED"):
            break
        time.sleep(0.3)
    print("   final status:", status, "document_type:", r.json().get("document_type"))
    assert status in ("PROCESSED", "NEEDS_REVIEW")

    print("7. GET /search (used by documentService.list)")
    r = client.get(f"{API}/search", headers=headers, params={"vault_id": vault_id, "q": "HbA1c"})
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1, r.json()
    print("   OK, found via free-text search")

    print("8. GET /documents/{id}/download (streams the original file)")
    r = client.get(f"{API}/documents/{document_id}/download", headers=headers)
    assert r.status_code == 200 and r.content.startswith(b"%PDF"), r.status_code
    print("   OK, got back", len(r.content), "bytes")

    print("9. GET /timeline")
    r = client.get(f"{API}/timeline", headers=headers, params={"vault_id": vault_id})
    assert r.status_code == 200 and len(r.json()) >= 1, r.text
    print("   OK:", r.json()[0]["event_type"])

    print("10. POST /expenses (manual) + GET /expenses/summary (checks by_month)")
    r = client.post(
        f"{API}/expenses", headers=headers, params={"vault_id": vault_id},
        json={"expense_date": "2026-09-15", "category": "MEDICINE", "amount": 500},
    )
    assert r.status_code == 201, r.text
    expense_id = r.json()["id"]
    r = client.get(f"{API}/expenses/summary", headers=headers, params={"vault_id": vault_id})
    assert len(r.json()["by_month"]) == 6, r.json()
    print("   OK, by_month has 6 buckets")
    r = client.delete(f"{API}/expenses/{expense_id}", headers=headers)
    assert r.status_code == 204
    print("   OK, manual expense deleted")

    print("11. POST /summaries/generate + GET /summaries/latest")
    r = client.post(f"{API}/summaries/generate", headers=headers, params={"vault_id": vault_id})
    assert r.status_code == 201, r.text
    r = client.get(f"{API}/summaries/latest", headers=headers, params={"vault_id": vault_id})
    assert r.status_code == 200, r.text
    print("   OK:", r.json()["summary_text"][:80], "...")

    print("12. POST /sharing (category-based grant) + GET /sharing")
    r = client.post(
        f"{API}/sharing", headers=headers, params={"vault_id": vault_id},
        json={"shared_with_email": "doctor@example.com", "role": "DOCTOR", "allowed_document_types": ["LAB_REPORT"]},
    )
    assert r.status_code == 201, r.text
    share_id = r.json()["id"]
    r = client.get(f"{API}/sharing", headers=headers, params={"vault_id": vault_id})
    assert len(r.json()) == 1
    r = client.delete(f"{API}/sharing/{share_id}", headers=headers)
    assert r.status_code == 204
    print("   OK, share created and revoked")

    print("13. CORS preflight for the Vite origin")
    r = client.options(
        f"{API}/documents", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173", r.headers
    print("   OK, CORS allows the Vite dev origin with Authorization header")

    print("\nALL HTTP INTEGRATION CHECKS PASSED")


if __name__ == "__main__":
    main()
