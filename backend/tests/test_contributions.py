"""Tests de la limitation de débit anti-spam sur les contributions anonymes."""
from app.core.security import create_access_token, hash_password
from app.domain.enums import UserRole
from app.infrastructure.models import User
from tests.conftest import TestingSession


def _propose(client, term):
    return client.post("/api/v1/contributions", json={
        "term": term, "fr_translation": "test", "force_create": True,
    })


def test_rate_limit_blocks_after_ten(client):
    for i in range(10):
        r = _propose(client, f"motrate{i}")
        assert r.status_code == 201, r.text

    r = _propose(client, "motrateextra")
    assert r.status_code == 429


def test_rate_limit_bypassed_for_admin(client):
    for i in range(10):
        r = _propose(client, f"motrateadmin{i}")
        assert r.status_code == 201, r.text

    db = TestingSession()
    admin = User(
        email="admin@test.dev", username="admin", full_name="Admin",
        hashed_password=hash_password("Password1!"), role=UserRole.ADMIN, is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token(admin.id)
    db.close()

    r = client.post(
        "/api/v1/contributions",
        json={"term": "motrateadminextra", "fr_translation": "test", "force_create": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201, r.text
