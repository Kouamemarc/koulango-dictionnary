"""Schémas liés aux mots, définitions, exemples, etc."""
from typing import Literal

from pydantic import BaseModel, Field

from app.domain.enums import WordStatus


class TranslationIn(BaseModel):
    language: str = "fr"  # "fr" | "en"
    text: str
    example: str | None = None
    example_translation: str | None = None


class TranslationOut(TranslationIn):
    id: int
    model_config = {"from_attributes": True}


class DefinitionIn(BaseModel):
    text: str


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
    fr_translation: str | None = None
    en_translation: str | None = None
    part_of_speech: str | None = None
    definition: str | None = None
    example: str | None = None
    example_translation: str | None = None
    dialect_id: int | None = None
    pronunciation: str | None = None
    audio_url: str | None = None
    image_url: str | None = None
    source: str | None = None
    translations: list[TranslationIn] = []
    # Si l'utilisateur a confirmé qu'il s'agit d'un nouveau mot malgré les suggestions
    force_create: bool = False
    # Accord pour publier la contribution (audio compris) et l'utiliser pour développer
    # une IA koulango. Non bloquant côté API : les anciennes versions de l'app ne l'envoient pas.
    ai_consent: bool | None = None


class ContributionBatch(BaseModel):
    """Plusieurs mots extraits d'une publication, proposés en une fois (chacun modéré)."""
    entries: list[WordCreate] = Field(min_length=1, max_length=30)


class BatchItemResult(BaseModel):
    term: str
    status: Literal["created", "skipped"]
    word_id: int | None = None
    detail: str | None = None


class WordSummary(BaseModel):
    id: int
    term: str
    fr_translation: str | None
    image_url: str | None = None
    part_of_speech: str | None = None
    definition: str | None = None
    example: str | None = None
    audio_url: str | None = None
    status: WordStatus
    model_config = {"from_attributes": True}


class WordDetail(BaseModel):
    id: int
    term: str
    fr_translation: str | None
    en_translation: str | None
    part_of_speech: str | None
    source: str | None
    image_url: str | None
    status: WordStatus
    dialect_id: int | None
    translations: list[TranslationOut] = []
    definitions: list[DefinitionOut] = []
    examples: list[ExampleOut] = []
    pronunciations: list[PronunciationOut] = []
    audios: list[AudioOut] = []
    model_config = {"from_attributes": True}


class WordEdit(BaseModel):
    """Édition complète d'un mot existant (réservé à la modération)."""
    term: str = Field(min_length=1, max_length=255)
    fr_translation: str | None = None
    en_translation: str | None = None
    part_of_speech: str | None = None
    source: str | None = None
    image_url: str | None = None
    dialect_id: int | None = None
    translations: list[TranslationIn] = []
    definitions: list[DefinitionIn] = []
    examples: list[ExampleIn] = []
    pronunciations: list[PronunciationIn] = []
    audios: list[AudioIn] = []


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
