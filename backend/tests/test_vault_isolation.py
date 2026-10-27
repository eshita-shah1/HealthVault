from fastapi.testclient import TestClient


def _register(client: TestClient, email: str) -> dict:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "full_name": email.split("@")[0]},
    )
    assert r.status_code == 201
    return r.json()


def test_each_user_gets_own_vault(client: TestClient):
    a = _register(client, "vault_a@example.com")
    b = _register(client, "vault_b@example.com")

    ra = client.get("/api/v1/vault", headers={"Authorization": f"Bearer {a['access_token']}"})
    rb = client.get("/api/v1/vault", headers={"Authorization": f"Bearer {b['access_token']}"})

    vault_a_id = ra.json()[0]["id"]
    vault_b_id = rb.json()[0]["id"]
    assert vault_a_id != vault_b_id


def test_user_cannot_read_another_users_vault(client: TestClient):
    a = _register(client, "isolate_a@example.com")
    b = _register(client, "isolate_b@example.com")

    ra = client.get("/api/v1/vault", headers={"Authorization": f"Bearer {a['access_token']}"})
    vault_a_id = ra.json()[0]["id"]

    r = client.get(f"/api/v1/vault/{vault_a_id}", headers={"Authorization": f"Bearer {b['access_token']}"})
    assert r.status_code == 404


def test_user_cannot_list_documents_of_another_vault(client: TestClient):
    a = _register(client, "docs_a@example.com")
    b = _register(client, "docs_b@example.com")

    ra = client.get("/api/v1/vault", headers={"Authorization": f"Bearer {a['access_token']}"})
    vault_a_id = ra.json()[0]["id"]

    r = client.get(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {b['access_token']}"},
        params={"vault_id": vault_a_id},
    )
    assert r.status_code == 404


def test_user_cannot_upload_to_another_vault(client: TestClient):
    a = _register(client, "upload_a@example.com")
    b = _register(client, "upload_b@example.com")

    ra = client.get("/api/v1/vault", headers={"Authorization": f"Bearer {a['access_token']}"})
    vault_a_id = ra.json()[0]["id"]

    r = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {b['access_token']}"},
        data={"vault_id": vault_a_id},
        files={"file": ("x.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert r.status_code == 404
