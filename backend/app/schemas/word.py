"""Schémas liés aux mots, définitions, exemples, etc."""
from pydantic import BaseModel, Field

from app.domain.enums import WordStatus


class DefinitionIn(BaseModel):
    text: str
    part_of_speech: str | None = None


class ExampleIn(BaseModel):
    sentence: str
    translation: str | None = None


class PronunciationIn(BaseModel):
    ipa: str | None = None
    phonetic: str | None = None


class AudioIn(BaseModel):
    url: str
    duration_ms: int | None = None
    speaker: str | None = None


class DefinitionOut(DefinitionIn):
    id: int
    model_config = {"from_attributes": True}


class ExampleOut(ExampleIn):
    id: int
    model_config = {"from_attributes": True}


class PronunciationOut(PronunciationIn):
    id: int
    model_config = {"from_attributes": True}


class AudioOut(AudioIn):
    id: int
    model_config = {"from_attributes": True}


class WordCreate(BaseModel):
    """Formulaire d'ajout d'un mot (proposition de contribution)."""
    term: str = Field(min_length=1, max_length=255)
    expression: str | None = None
    fr_translation: str | None = None
    en_translation: str | None = None
    definition: str | None = None
    example: str | None = None
    dialect_id: int | None = None
    pronunciation: str | None = None
    audio_url: str | None = None
    source: str | None = None
    # Si l'utilisateur a confirmé qu'il s'agit d'un nouveau mot malgré les suggestions
    force_create: bool = False


class WordSummary(BaseModel):
    id: int
    term: str
    fr_translation: str | None
    status: WordStatus
    model_config = {"from_attributes": True}


class WordDetail(BaseModel):
    id: int
    term: str
    fr_translation: str | None
    en_translation: str | None
    source: str | None
    status: WordStatus
    dialect_id: int | None
    definitions: list[DefinitionOut] = []
    examples: list[ExampleOut] = []
    pronunciations: list[PronunciationOut] = []
    audios: list[AudioOut] = []
    model_config = {"from_attributes": True}


class Suggestion(BaseModel):
    """Une proposition de la recherche floue."""
    word_id: int
    term: str
    similarity: float
    distance: int


class SmartCheckResponse(BaseModel):
    """Réponse de la vérification intelligente avant création."""
    exists: bool
    message: str
    suggestions: list[Suggestion] = []
