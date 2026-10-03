"""Schémas de l'assistant conversationnel d'ajout de mots."""
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.word import WordCreate


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    """Historique complet de la conversation (l'API est sans état)."""
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    # Proposition prête à être envoyée telle quelle à POST /contributions,
    # après confirmation de l'utilisateur. None tant que la conversation continue.
    draft: WordCreate | None = None
