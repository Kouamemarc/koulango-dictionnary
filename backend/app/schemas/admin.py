"""Schémas d'administration / modération."""
from pydantic import BaseModel, Field

from app.domain.enums import ValidationDecision


class ValidationRequest(BaseModel):
    decision: ValidationDecision
    reason: str | None = Field(default=None, description="Motif obligatoire en cas de refus")


class MergeRequest(BaseModel):
    source_word_id: int  # mot à fusionner (sera marqué FUSIONNE)
    target_word_id: int  # mot canonique conservé


class RejectRequest(BaseModel):
    reason: str = Field(min_length=3, description="Motif du refus")
