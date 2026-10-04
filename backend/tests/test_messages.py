"""Tests des messages des visiteurs (contact, demande pour devenir modérateur)."""
from app.core.security import create_access_token, hash_password
from app.domain.enums import UserRole
from app.infrastructure.models import User
from tests.conftest import TestingSession


def _moderator_headers():
    db = TestingSession()
    user = User(
        email="modo@test.dev", username="modo", full_name="Modo",
        hashed_password=hash_password("Password1!"), role=UserRole.MODERATOR, is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_contact_and_moderator_messages(client):
    r = client.post("/api/v1/messages", json={"kind": "contact", "body": "  Ajoutez la recherche vocale !  "})
    assert r.status_code == 201, r.text
    assert r.json()["body"] == "Ajoutez la recherche vocale !"

    # Une candidature sans moyen de contact est refusée.
    r = client.post("/api/v1/messages", json={"kind": "moderateur", "name": "Awa", "body": "Je parle koulango."})
    assert r.status_code == 422
    r = client.post("/api/v1/messages", json={
        "kind": "moderateur", "name": "Awa", "contact": "+225 07 00 00 00 00",
        "region": "Bounkani", "koulango_level": "Langue maternelle", "body": "Je parle koulango depuis l'enfance.",
    })
    assert r.status_code == 201, r.text

    assert client.get("/api/v1/admin/messages").status_code == 401
    headers = _moderator_headers()
    msgs = client.get("/api/v1/admin/messages", headers=headers).json()
    assert {m["kind"] for m in msgs} == {"contact", "moderateur"}
    assert all(not m["is_read"] for m in msgs)

    r = client.post(f"/api/v1/admin/messages/{msgs[0]['id']}/read", headers=headers)
    assert r.status_code == 200 and r.json()["is_read"] is True
    # Les messages lus passent après les non lus.
    assert client.get("/api/v1/admin/messages", headers=headers).json()[-1]["id"] == msgs[0]["id"]


def test_message_rate_limit(client):
    for i in range(5):
        assert client.post("/api/v1/messages", json={"kind": "contact", "body": f"message {i}"}).status_code == 201
    assert client.post("/api/v1/messages", json={"kind": "contact", "body": "un de trop"}).status_code == 429
