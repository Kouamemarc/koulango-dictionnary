"""Tests de l'assistant d'ajout de mots, avec un faux client Claude (aucun appel réseau)."""
from types import SimpleNamespace

import pytest

from app.api.routers.assistant import get_assistant_service
from app.application.services import assistant_service
from app.application.services.assistant_service import RECAP_REPLY, AssistantService
from app.application.services.word_service import WordService
from app.infrastructure.repositories.word_repository import WordRepository
from app.main import app
from tests.conftest import TestingSession


def _text(text):
    return SimpleNamespace(type="text", text=text)


def _tool(id_, name, input_):
    return SimpleNamespace(type="tool_use", id=id_, name=name, input=input_)


class FakeClient:
    """Rejoue une suite de réponses prédéfinies et mémorise les requêtes reçues."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)


@pytest.fixture()
def use_fake(client):
    def install(responses):
        fake = FakeClient(responses)
        app.dependency_overrides[get_assistant_service] = lambda: AssistantService(
            fake, WordService(WordRepository(TestingSession()))
        )
        return fake

    yield install
    assistant_service.rate_limiter._hits.clear()


def test_simple_question(client, use_fake):
    fake = use_fake([SimpleNamespace(stop_reason="end_turn", content=[_text("Que signifie ce mot en français ?")])])
    r = client.post("/api/v1/assistant/chat", json={"messages": [{"role": "user", "content": "Je veux ajouter kpɔ"}]})
    assert r.status_code == 200, r.text
    assert r.json() == {"reply": "Que signifie ce mot en français ?", "draft": None}
    assert fake.calls[0]["messages"] == [{"role": "user", "content": "Je veux ajouter kpɔ"}]


def test_prepare_word_returns_draft(client, use_fake):
    fake = use_fake([
        SimpleNamespace(stop_reason="tool_use", content=[_tool("t1", "prepare_word", {
            "term": " kpɔ ", "fr_translation": "maison", "en_translation": "house",
            "part_of_speech": "nom", "other_translations": [{"language": "fr", "text": "case"}],
            "confirmed_new_word": True,
        })]),
    ])
    r = client.post("/api/v1/assistant/chat", json={"messages": [
        {"role": "user", "content": "kpɔ"},
        {"role": "assistant", "content": "Que veut-il dire ?"},
        {"role": "user", "content": "maison, c'est tout"},
    ]})
    assert r.status_code == 200, r.text
    body = r.json()
    # Réponse fixe après le récapitulatif : un seul appel au modèle pour ce tour.
    assert body["reply"] == RECAP_REPLY
    assert len(fake.calls) == 1
    draft = body["draft"]
    assert draft["term"] == "kpɔ"
    assert draft["en_translation"] == "house"
    assert draft["force_create"] is True
    assert draft["translations"][0]["text"] == "case"

    # Le brouillon est directement accepté par l'endpoint de contribution.
    r = client.post("/api/v1/contributions", json=draft)
    assert r.status_code == 201, r.text


def test_refusal_is_handled(client, use_fake):
    use_fake([SimpleNamespace(stop_reason="refusal", content=[])])
    r = client.post("/api/v1/assistant/chat", json={"messages": [{"role": "user", "content": "..."}]})
    assert r.status_code == 200
    assert r.json()["draft"] is None


def test_must_start_with_user(client, use_fake):
    use_fake([])
    r = client.post("/api/v1/assistant/chat", json={"messages": [{"role": "assistant", "content": "Bonjour"}]})
    assert r.status_code == 422


def test_rate_limit(client, use_fake, monkeypatch):
    monkeypatch.setattr(assistant_service.settings, "ASSISTANT_RATE_LIMIT_PER_HOUR", 2)
    use_fake([SimpleNamespace(stop_reason="end_turn", content=[_text("ok")]) for _ in range(3)])
    payload = {"messages": [{"role": "user", "content": "salut"}]}
    assert client.post("/api/v1/assistant/chat", json=payload).status_code == 200
    assert client.post("/api/v1/assistant/chat", json=payload).status_code == 200
    assert client.post("/api/v1/assistant/chat", json=payload).status_code == 429


def test_disabled_without_api_key(client, monkeypatch):
    monkeypatch.setattr(assistant_service.settings, "ANTHROPIC_API_KEY", "")
    r = client.post("/api/v1/assistant/chat", json={"messages": [{"role": "user", "content": "salut"}]})
    assert r.status_code == 503
