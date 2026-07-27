"""Modèles ORM SQLAlchemy — schéma relationnel complet du dictionnaire.

Tables : users, dialects, words, expressions, definitions, examples,
pronunciations, audios, synonyms, contributions, validations, favorites,
history, reports, notifications.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey, Integer, LargeBinary, String, Text,
    UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.enums import (
    ContributionType, ReportStatus, UserRole, ValidationDecision, WordStatus,
)


class TimestampMixin:
    """Colonnes created_at / updated_at communes."""
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# --------------------------------------------------------------------------- #
#  Utilisateurs
# --------------------------------------------------------------------------- #
class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(150))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    contributions: Mapped[list["Contribution"]] = relationship(back_populates="author")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="user")


# --------------------------------------------------------------------------- #
#  Dialectes
# --------------------------------------------------------------------------- #
class Dialect(Base, TimestampMixin):
    __tablename__ = "dialects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    region: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)

    words: Mapped[list["Word"]] = relationship(back_populates="dialect")


# --------------------------------------------------------------------------- #
#  Mots (entité centrale)
# --------------------------------------------------------------------------- #
class Word(Base, TimestampMixin):
    __tablename__ = "words"

    id: Mapped[int] = mapped_column(primary_key=True)
    term: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    normalized: Mapped[str] = mapped_column(String(255), index=True, nullable=False)  # minuscules, sans accents
    fr_translation: Mapped[str | None] = mapped_column(String(500))
    en_translation: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str | None] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[WordStatus] = mapped_column(
        Enum(WordStatus), default=WordStatus.PENDING, index=True, nullable=False
    )
    # En cas de fusion : pointe vers le mot canonique conservé
    merged_into_id: Mapped[int | None] = mapped_column(ForeignKey("words.id", ondelete="SET NULL"))

    dialect_id: Mapped[int | None] = mapped_column(ForeignKey("dialects.id", ondelete="SET NULL"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    dialect: Mapped["Dialect"] = relationship(back_populates="words")
    translations: Mapped[list["Translation"]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )
    definitions: Mapped[list["Definition"]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )
    examples: Mapped[list["Example"]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )
    pronunciations: Mapped[list["Pronunciation"]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )
    audios: Mapped[list["Audio"]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )
    expressions: Mapped[list["Expression"]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )
    # Synonymes : relation auto-référente via table d'association
    synonyms: Mapped[list["Synonym"]] = relationship(
        foreign_keys="Synonym.word_id", back_populates="word", cascade="all, delete-orphan"
    )

    # Extraits pour les cartes de résultat (WordSummary), sans requête supplémentaire
    # si definitions/examples sont préchargées (selectinload) par le repository.
    @property
    def part_of_speech(self) -> str | None:
        return self.definitions[0].part_of_speech if self.definitions else None

    @property
    def definition(self) -> str | None:
        return self.definitions[0].text if self.definitions else None

    @property
    def example(self) -> str | None:
        return self.examples[0].sentence if self.examples else None

    @property
    def audio_url(self) -> str | None:
        return self.audios[0].url if self.audios else None


class Expression(Base, TimestampMixin):
    __tablename__ = "expressions"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    meaning: Mapped[str | None] = mapped_column(Text)

    word: Mapped["Word"] = relationship(back_populates="expressions")


class Translation(Base, TimestampMixin):
    """Traduction alternative d'un mot (un mot koulango peut se traduire de
    plusieurs façons) — fr_translation/en_translation restent la traduction
    principale affichée partout ; ceci couvre les traductions supplémentaires."""
    __tablename__ = "translations"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    language: Mapped[str] = mapped_column(String(10), default="fr", nullable=False)  # "fr" | "en"
    text: Mapped[str] = mapped_column(String(500), nullable=False)

    word: Mapped["Word"] = relationship(back_populates="translations")


class Definition(Base, TimestampMixin):
    __tablename__ = "definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    part_of_speech: Mapped[str | None] = mapped_column(String(60))  # nom, verbe, adjectif...

    word: Mapped["Word"] = relationship(back_populates="definitions")


class Example(Base, TimestampMixin):
    __tablename__ = "examples"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    sentence: Mapped[str] = mapped_column(Text, nullable=False)
    translation: Mapped[str | None] = mapped_column(Text)

    word: Mapped["Word"] = relationship(back_populates="examples")


class Pronunciation(Base, TimestampMixin):
    __tablename__ = "pronunciations"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    ipa: Mapped[str | None] = mapped_column(String(255))  # transcription phonétique
    phonetic: Mapped[str | None] = mapped_column(String(255))  # graphie simplifiée

    word: Mapped["Word"] = relationship(back_populates="pronunciations")


class Audio(Base, TimestampMixin):
    __tablename__ = "audios"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    speaker: Mapped[str | None] = mapped_column(String(120))

    word: Mapped["Word"] = relationship(back_populates="audios")


class Synonym(Base):
    __tablename__ = "synonyms"
    __table_args__ = (UniqueConstraint("word_id", "synonym_id", name="uq_synonym_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    synonym_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))

    word: Mapped["Word"] = relationship(foreign_keys=[word_id], back_populates="synonyms")


# --------------------------------------------------------------------------- #
#  Variantes orthographiques
# --------------------------------------------------------------------------- #
class SpellingVariant(Base, TimestampMixin):
    __tablename__ = "spelling_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    variant: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    normalized: Mapped[str] = mapped_column(String(255), index=True, nullable=False)


# --------------------------------------------------------------------------- #
#  Contributions & validations (workflow)
# --------------------------------------------------------------------------- #
class Contribution(Base, TimestampMixin):
    __tablename__ = "contributions"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    word_id: Mapped[int | None] = mapped_column(ForeignKey("words.id", ondelete="SET NULL"))
    type: Mapped[ContributionType] = mapped_column(Enum(ContributionType), default=ContributionType.CREATE)
    payload: Mapped[str | None] = mapped_column(Text)  # snapshot JSON de la proposition
    status: Mapped[WordStatus] = mapped_column(Enum(WordStatus), default=WordStatus.PENDING, index=True)

    author: Mapped["User | None"] = relationship(back_populates="contributions")
    validation: Mapped["Validation"] = relationship(
        back_populates="contribution", uselist=False, cascade="all, delete-orphan"
    )


class Validation(Base, TimestampMixin):
    __tablename__ = "validations"

    id: Mapped[int] = mapped_column(primary_key=True)
    contribution_id: Mapped[int] = mapped_column(ForeignKey("contributions.id", ondelete="CASCADE"))
    moderator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    decision: Mapped[ValidationDecision] = mapped_column(Enum(ValidationDecision), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)  # motif de refus obligatoire

    contribution: Mapped["Contribution"] = relationship(back_populates="validation")


# --------------------------------------------------------------------------- #
#  Favoris & historique
# --------------------------------------------------------------------------- #
class Favorite(Base, TimestampMixin):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "word_id", name="uq_user_word_favorite"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))

    user: Mapped["User"] = relationship(back_populates="favorites")


class SearchHistory(Base, TimestampMixin):
    __tablename__ = "search_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    query: Mapped[str] = mapped_column(String(255), nullable=False)
    word_id: Mapped[int | None] = mapped_column(ForeignKey("words.id", ondelete="SET NULL"))


# --------------------------------------------------------------------------- #
#  Signalements & notifications
# --------------------------------------------------------------------------- #
class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"))
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.OPEN, index=True)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


# --------------------------------------------------------------------------- #
#  Fichiers média uploadés (illustrations, audio) — stockés en base
# --------------------------------------------------------------------------- #
class MediaFile(Base, TimestampMixin):
    __tablename__ = "media_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
