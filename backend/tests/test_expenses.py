from datetime import date

from fastapi.testclient import TestClient


def test_create_manual_expense_and_summary(client: TestClient, auth_headers: dict, vault_id: str):
    headers = {"Authorization": auth_headers["Authorization"]}

    r = client.post(
        "/api/v1/expenses", headers=headers, params={"vault_id": vault_id},
        json={
            "expense_date": date.today().isoformat(),
            "category": "DOCTOR_CONSULTATION",
            "amount": 1500,
            "hospital_name": "City Clinic",
            "insurance_covered": 500,
        },
    )
    assert r.status_code == 201, r.text
    expense = r.json()
    assert expense["patient_paid"] == 1000

    r = client.get("/api/v1/expenses/summary", headers=headers, params={"vault_id": vault_id})
    summary = r.json()
    assert summary["total"] >= 1500
    assert summary["by_category"]["DOCTOR_CONSULTATION"] >= 1500
    assert len(summary["by_month"]) == 6
    assert summary["by_month"][-1]["month"] == date.today().strftime("%b")

    r = client.get("/api/v1/expenses", headers=headers, params={"vault_id": vault_id})
    assert any(e["id"] == expense["id"] for e in r.json())


def test_manual_expense_can_be_deleted(client: TestClient, auth_headers: dict, vault_id: str):
    headers = {"Authorization": auth_headers["Authorization"]}
    r = client.post(
        "/api/v1/expenses", headers=headers, params={"vault_id": vault_id},
        json={"expense_date": date.today().isoformat(), "category": "MEDICINE", "amount": 200},
    )
    expense_id = r.json()["id"]

    r = client.delete(f"/api/v1/expenses/{expense_id}", headers=headers)
    assert r.status_code == 204

    r = client.get("/api/v1/expenses", headers=headers, params={"vault_id": vault_id})
    assert not any(e["id"] == expense_id for e in r.json())


def test_expenses_require_vault_access(client: TestClient):
    a = client.post(
        "/api/v1/auth/register",
        json={"email": "exp_a@example.com", "password": "supersecret123", "full_name": "A"},
    ).json()
    b = client.post(
        "/api/v1/auth/register",
        json={"email": "exp_b@example.com", "password": "supersecret123", "full_name": "B"},
    ).json()
    vault_a_id = client.get(
        "/api/v1/vault", headers={"Authorization": f"Bearer {a['access_token']}"}
    ).json()[0]["id"]

    r = client.get(
        "/api/v1/expenses/summary",
        headers={"Authorization": f"Bearer {b['access_token']}"},
        params={"vault_id": vault_a_id},
    )
    assert r.status_code == 404
