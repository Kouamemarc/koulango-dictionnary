"""Cas d'usage de modération / administration."""
from fastapi import HTTPException, status
from sqlalchemy import select

from app.domain.enums import ValidationDecision, WordStatus
from app.infrastructure.models import (
    Audio, Contribution, Definition, Example, Notification, Pronunciation, Validation, Word,
)
from app.infrastructure.repositories.word_repository import normalize
from app.schemas.admin import MergeRequest, PendingContribution, ValidationRequest
from app.schemas.word import WordCreate, WordEdit


class AdminService:
    def __init__(self, db):
        self.db = db

    def list_pending(self, limit: int = 50, offset: int = 0) -> list[PendingContribution]:
        """Contributions en attente, avec l'id de contribution nécessaire à /review."""
        rows = self.db.execute(
            select(Contribution, Word)
            .join(Word, Contribution.word_id == Word.id)
            .where(Contribution.status == WordStatus.PENDING)
            .order_by(Contribution.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        return [
            PendingContribution(
                contribution_id=c.id,
                word_id=w.id,
                term=w.term,
                fr_translation=w.fr_translation,
                en_translation=w.en_translation,
                created_at=c.created_at,
            )
            for c, w in rows
        ]

    def _notify(self, user_id: int | None, title: str, body: str) -> None:
        if user_id is None:
            return
        self.db.add(Notification(user_id=user_id, title=title, body=body))

    def review_contribution(self, contribution_id: int, req: ValidationRequest, moderator_id: int) -> Contribution:
        contribution = self.db.get(Contribution, contribution_id)
        if not contribution:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Contribution introuvable.")
        if contribution.status != WordStatus.PENDING:
            raise HTTPException(status.HTTP_409_CONFLICT, "Contribution déjà traitée.")

        word = self.db.get(Word, contribution.word_id) if contribution.word_id else None

        if req.decision == ValidationDecision.REJECTED and not req.reason:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Un motif de refus est obligatoire.")

        if req.decision == ValidationDecision.ACCEPTED:
            contribution.status = WordStatus.PUBLISHED
            if word:
                word.status = WordStatus.PUBLISHED
            self._notify(contribution.author_id, "Contribution acceptée", "Votre mot a été publié.")
        elif req.decision == ValidationDecision.REJECTED:
            contribution.status = WordStatus.REJECTED
            if word:
                word.status = WordStatus.REJECTED
            self._notify(contribution.author_id, "Contribution refusée", f"Motif : {req.reason}")

        self.db.add(Validation(
            contribution_id=contribution.id,
            moderator_id=moderator_id,
            decision=req.decision,
            reason=req.reason,
        ))
        self.db.commit()
        self.db.refresh(contribution)
        return contribution

    def create_word(self, data: WordCreate) -> Word:
        """Ajout direct par un modérateur/admin : publié immédiatement, sans file d'attente."""
        norm = normalize(data.term)
        if self.db.scalar(select(Word).where(Word.normalized == norm)):
            raise HTTPException(status.HTTP_409_CONFLICT, "Ce mot existe déjà.")

        word = Word(
            term=data.term.strip(),
            normalized=norm,
            fr_translation=data.fr_translation,
            en_translation=data.en_translation,
            source=data.source,
            image_url=data.image_url,
            dialect_id=data.dialect_id,
            status=WordStatus.PUBLISHED,
        )
        if data.definition:
            word.definitions.append(Definition(text=data.definition))
        if data.example:
            word.examples.append(Example(sentence=data.example))
        if data.pronunciation:
            word.pronunciations.append(Pronunciation(phonetic=data.pronunciation))
        if data.audio_url:
            word.audios.append(Audio(url=data.audio_url))

        self.db.add(word)
        self.db.commit()
        self.db.refresh(word)
        return word

    def update_word(self, word_id: int, data: WordEdit) -> Word:
        """Édition complète d'un mot : champs principaux + remplacement des sous-entités."""
        word = self.db.get(Word, word_id)
        if not word:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mot introuvable.")

        norm = normalize(data.term)
        if norm != word.normalized:
            clash = self.db.scalar(select(Word).where(Word.normalized == norm, Word.id != word_id))
            if clash:
                raise HTTPException(status.HTTP_409_CONFLICT, "Un autre mot utilise déjà ce terme.")

        word.term = data.term.strip()
        word.normalized = norm
        word.fr_translation = data.fr_translation
        word.en_translation = data.en_translation
        word.source = data.source
        word.image_url = data.image_url
        word.dialect_id = data.dialect_id
        word.definitions = [Definition(text=d.text, part_of_speech=d.part_of_speech) for d in data.definitions]
        word.examples = [Example(sentence=e.sentence, translation=e.translation) for e in data.examples]
        word.pronunciations = [Pronunciation(ipa=p.ipa, phonetic=p.phonetic) for p in data.pronunciations]
        word.audios = [Audio(url=a.url, duration_ms=a.duration_ms, speaker=a.speaker) for a in data.audios]

        self.db.commit()
        self.db.refresh(word)
        return word

    def merge_words(self, req: MergeRequest) -> Word:
        """Fusionne deux mots : source -> target (le canonique conservé)."""
        source = self.db.get(Word, req.source_word_id)
        target = self.db.get(Word, req.target_word_id)
        if not source or not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mot source ou cible introuvable.")
        if source.id == target.id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Impossible de fusionner un mot avec lui-même.")

        # Rattacher les sous-entités du source vers le target
        for coll in (source.definitions, source.examples, source.pronunciations, source.audios):
            for item in list(coll):
                item.word_id = target.id
        source.status = WordStatus.MERGED
        source.merged_into_id = target.id
        self.db.commit()
        self.db.refresh(target)
        return target
