"""Tests de l'import d'une publication par un utilisateur (extraction + envoi groupé, modérés)."""
from app.api.routers import contributions
from app.api.routers.contributions import _import_service
from app.application.services.import_service import ImportService
from app.infrastructure.models import Contribution, Word
from app.domain.enums import WordStatus
from app.main import app
from tests.conftest import TestingSession
from tests.test_import_consent import FakeClient, FakeWords, _entry


def test_public_extract_and_rate_limit(client, monkeypatch):
    monkeypatch.setattr(contributions, "IMPORT_EXTRACT_LIMIT_PER_HOUR", 2)
    contributions.import_rate_limiter._hits.clear()
    fake = FakeClient({"entries": [_entry("kpɔ", "maison"), _entry("mál", "riz")], "notes": None})
    app.dependency_overrides[_import_service] = lambda: ImportService(fake, FakeWords())

    r = client.post("/api/v1/contributions/import/extract", json={"text": "Kpɔ = maison\nMál = riz"})
    assert r.status_code == 200, r.text
    assert [(e["term"], e["existing"]) for e in r.json()["entries"]] == [("kpɔ", "new"), ("mál", "exists")]
    assert client.post("/api/v1/contributions/import/extract", json={"text": "x"}).status_code == 200
    assert client.post("/api/v1/contributions/import/extract", json={"text": "x"}).status_code == 429
    contributions.import_rate_limiter._hits.clear()


def test_batch_creates_pending_and_skips_existing(client):
    entry = {"source": "Groupe Facebook", "ai_consent": True}
    r = client.post("/api/v1/contributions/batch", json={"entries": [
        {"term": "kpɔbatch", "fr_translation": "maison", **entry},
        {"term": "málbatch", "fr_translation": "riz", **entry},
    ]})
    assert r.status_code == 201, r.text
    assert [x["status"] for x in r.json()] == ["created", "created"]

    # Renvoyé une seconde fois : le mot existe déjà, il est ignoré sans bloquer les autres.
    r = client.post("/api/v1/contributions/batch", json={"entries": [
        {"term": "kpɔbatch", "fr_translation": "maison", **entry},
        {"term": "dígôbatch", "fr_translation": "nourriture", **entry},
    ]})
    assert [(x["term"], x["status"]) for x in r.json()] == [("kpɔbatch", "skipped"), ("dígôbatch", "created")]
    assert r.json()[0]["detail"] == "Ce mot existe déjà."

    db = TestingSession()
    assert {w.status for w in db.query(Word).all()} == {WordStatus.PENDING}  # rien n'est publié directement
    assert all(c.ai_consent for c in db.query(Contribution).all())
    db.close()


def test_batch_rate_limit(client):
    big = [{"term": f"motimport{i}", "fr_translation": "x"} for i in range(30)]
    big2 = [{"term": f"autremot{i}", "fr_translation": "x"} for i in range(25)]
    assert client.post("/api/v1/contributions/batch", json={"entries": big}).status_code == 201
    assert client.post("/api/v1/contributions/batch", json={"entries": big2}).status_code == 201
    # 55 déjà proposés sur 6h : 10 de plus dépasseraient le plafond de 60.
    r = client.post("/api/v1/contributions/batch", json={"entries": [{"term": f"encore{i}"} for i in range(10)]})
    assert r.status_code == 429
