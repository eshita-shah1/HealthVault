from fastapi.testclient import TestClient


def test_latest_summary_404_when_none_generated(client: TestClient, auth_headers: dict, vault_id: str):
    r = client.get(
        "/api/v1/summaries/latest",
        headers={"Authorization": auth_headers["Authorization"]},
        params={"vault_id": vault_id},
    )
    assert r.status_code == 404


def test_generate_then_latest_returns_same_summary(client: TestClient, auth_headers: dict, vault_id: str):
    headers = {"Authorization": auth_headers["Authorization"]}
    r = client.post("/api/v1/summaries/generate", headers=headers, params={"vault_id": vault_id})
    assert r.status_code == 201, r.text
    generated = r.json()

    r = client.get("/api/v1/summaries/latest", headers=headers, params={"vault_id": vault_id})
    assert r.status_code == 200
    assert r.json()["id"] == generated["id"]
