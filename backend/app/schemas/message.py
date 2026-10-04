"""Schémas des messages des visiteurs (contact, demande pour devenir modérateur)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

MessageKind = Literal["contact", "moderateur"]


class MessageCreate(BaseModel):
    kind: MessageKind
    name: str | None = Field(default=None, max_length=120)
    contact: str | None = Field(default=None, max_length=200, description="E-mail ou téléphone/WhatsApp")
    region: str | None = Field(default=None, max_length=120)
    koulango_level: str | None = Field(default=None, max_length=60)
    body: str = Field(min_length=1, max_length=3000)

    @model_validator(mode="after")
    def _moderator_needs_contact(self):
        # Pour une candidature, il faut pouvoir recontacter la personne.
        if self.kind == "moderateur" and not ((self.name or "").strip() and (self.contact or "").strip()):
            raise ValueError("Le nom et un moyen de contact sont requis pour devenir modérateur.")
        return self


class MessageOut(BaseModel):
    id: int
    kind: MessageKind
    name: str | None
    contact: str | None
    region: str | None
    koulango_level: str | None
    body: str
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}
