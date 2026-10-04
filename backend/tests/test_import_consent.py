"""Tests du consentement des contributeurs et de l'import de mots depuis une publication."""
import json
from types import SimpleNamespace

from app.api.routers.admin import get_import_service
from app.application.services.import_service import ImportService
from app.core.security import create_access_token, hash_password
from app.domain.enums import UserRole
from app.infrastructure.models import Contribution, User
from app.main import app
from app.schemas.word import SmartCheckResponse, Suggestion
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


def test_consent_is_recorded(client):
    r = client.post("/api/v1/contributions", json={
        "term": "kpɔconsent", "fr_translation": "maison", "force_create": True, "ai_consent": True,
    })
    assert r.status_code == 201, r.text
    r = client.post("/api/v1/contributions", json={"term": "anciennapp", "force_create": True})
    assert r.status_code == 201, r.text

    db = TestingSession()
    rows = {c.payload and json.loads(c.payload)["term"]: c for c in db.query(Contribution).all()}
    assert rows["kpɔconsent"].ai_consent is True and rows["kpɔconsent"].consent_version
    # Ancienne version de l'app : la question n'a pas été posée.
    assert rows["anciennapp"].ai_consent is None and rows["anciennapp"].consent_version is None
    db.close()

    pending = client.get("/api/v1/admin/pending", headers=_moderator_headers()).json()
    assert {p["term"]: p["ai_consent"] for p in pending} == {"kpɔconsent": True, "anciennapp": None}


class FakeWords:
    def smart_check(self, term):
        if term == "mál":
            return SmartCheckResponse(exists=True, message="", suggestions=[Suggestion(word_id=1, term="mál", similarity=1, distance=0)])
        if term == "dígo":
            return SmartCheckResponse(exists=False, message="", suggestions=[Suggestion(word_id=2, term="dígô", similarity=0.8, distance=1)])
        return SmartCheckResponse(exists=False, message="", suggestions=[])


class FakeClient:
    def __init__(self, payload, stop_reason="end_turn"):
        self.calls = []
        self.response = SimpleNamespace(
            stop_reason=stop_reason, content=[SimpleNamespace(type="text", text=json.dumps(payload))]
        )
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def with_options(self, **_):
        return self

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self.response


def _entry(term, fr):
    return {"term": term, "fr_translation": fr, "en_translation": None, "part_of_speech": None, "definition": None,
            "example": None, "example_translation": None, "pronunciation": None}


def test_import_extract(client):
    fake = FakeClient({"entries": [_entry("mál", "riz"), _entry("dígo", "nourriture"), _entry("kpɔ", "maison"), _entry(" ", "x")],
                       "notes": "Un mot illisible ignoré."})
    app.dependency_overrides[get_import_service] = lambda: ImportService(fake, FakeWords())
    r = client.post("/api/v1/admin/import/extract", headers=_moderator_headers(), json={
        "text": "Mál = riz\nDígo = nourriture\nKpɔ = maison",
        "images": [{"media_type": "image/png", "data": "aGVsbG8="}],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert [(e["term"], e["existing"]) for e in body["entries"]] == [("mál", "exists"), ("dígo", "similar"), ("kpɔ", "new")]
    assert body["entries"][1]["matches"] == ["dígô"]
    assert body["notes"] == "Un mot illisible ignoré."
    content = fake.calls[0]["messages"][0]["content"]
    assert content[0]["type"] == "image" and content[-1]["type"] == "text"


def test_import_requires_content_and_moderator(client):
    app.dependency_overrides[get_import_service] = lambda: ImportService(FakeClient({"entries": [], "notes": None}), FakeWords())
    assert client.post("/api/v1/admin/import/extract", json={"text": "Mál = riz"}).status_code == 401
    r = client.post("/api/v1/admin/import/extract", headers=_moderator_headers(), json={"text": "  "})
    assert r.status_code == 422


def test_import_too_long(client):
    fake = FakeClient({"entries": [], "notes": None}, stop_reason="max_tokens")
    app.dependency_overrides[get_import_service] = lambda: ImportService(fake, FakeWords())
    r = client.post("/api/v1/admin/import/extract", headers=_moderator_headers(), json={"text": "Mál = riz"})
    assert r.status_code == 422
