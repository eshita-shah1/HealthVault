from fastapi.testclient import TestClient


def test_dashboard_reflects_empty_vault(client: TestClient, auth_headers: dict, vault_id: str):
    r = client.get(
        f"/api/v1/vault/{vault_id}/dashboard", headers={"Authorization": auth_headers["Authorization"]}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["document_count"] == 0
    assert body["member_count"] == 1
    assert body["expense_total"] == 0


def test_dashboard_requires_vault_access(client: TestClient, vault_id: str):
    other = client.post(
        "/api/v1/auth/register",
        json={"email": "dashboard_intruder@example.com", "password": "supersecret123", "full_name": "X"},
    ).json()
    r = client.get(
        f"/api/v1/vault/{vault_id}/dashboard", headers={"Authorization": f"Bearer {other['access_token']}"}
    )
    assert r.status_code == 404
