"""Schémas de l'import de mots depuis une publication (ex : groupe Facebook)."""
from typing import Literal

from pydantic import BaseModel, Field


class ImportImage(BaseModel):
    """Capture d'écran d'une publication, encodée en base64 (sans le préfixe data:)."""
    media_type: Literal["image/png", "image/jpeg", "image/webp", "image/gif"]
    data: str = Field(max_length=7_000_000)  # ~5 Mo une fois décodée


class ImportRequest(BaseModel):
    text: str = Field(default="", max_length=20_000)
    images: list[ImportImage] = Field(default=[], max_length=5)


class ImportEntry(BaseModel):
    term: str
    fr_translation: str | None = None
    en_translation: str | None = None
    part_of_speech: str | None = None
    definition: str | None = None
    example: str | None = None
    example_translation: str | None = None
    pronunciation: str | None = None
    # Comparaison avec le dictionnaire : nouveau mot, déjà présent, ou proche d'un mot existant.
    existing: Literal["new", "exists", "similar", "unknown"] = "new"
    matches: list[str] = []


class ImportResponse(BaseModel):
    entries: list[ImportEntry]
    # Remarques de l'IA pour le modérateur (passages illisibles, éléments ignorés…).
    notes: str | None = None
