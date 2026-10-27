from fastapi.testclient import TestClient


def test_register_and_me(client: TestClient):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "password": "supersecret123", "full_name": "Alice"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "alice@example.com"
    assert "access_token" in body and "refresh_token" in body

    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


def test_register_duplicate_email_rejected(client: TestClient):
    payload = {"email": "bob@example.com", "password": "supersecret123", "full_name": "Bob"}
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


def test_login_wrong_password_rejected(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={"email": "carol@example.com", "password": "supersecret123", "full_name": "Carol"},
    )
    r = client.post("/api/v1/auth/login", json={"email": "carol@example.com", "password": "wrongpass"})
    assert r.status_code == 401


def test_me_requires_token(client: TestClient):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


def test_refresh_token_issues_new_access_token(client: TestClient):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "dave@example.com", "password": "supersecret123", "full_name": "Dave"},
    )
    refresh_token = r.json()["refresh_token"]
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r2.status_code == 200
    assert "access_token" in r2.json()
