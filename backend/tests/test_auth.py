"""Tests d'inscription, connexion et profil."""


def test_register_and_login(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "user@test.dev", "username": "user1", "password": "Password1!",
    })
    assert r.status_code == 201, r.text
    assert r.json()["role"] == "utilisateur"

    r = client.post("/api/v1/auth/login", json={
        "email": "user@test.dev", "password": "Password1!",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "user@test.dev"


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={
        "email": "a@test.dev", "username": "a", "password": "Password1!",
    })
    r = client.post("/api/v1/auth/login", json={"email": "a@test.dev", "password": "bad"})
    assert r.status_code == 401


def test_protected_requires_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401
