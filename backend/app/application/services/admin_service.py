"""Cas d'usage de modération / administration."""
from fastapi import HTTPException, status

from app.domain.enums import ValidationDecision, WordStatus
from app.infrastructure.models import Contribution, Notification, Validation, Word
from app.schemas.admin import MergeRequest, ValidationRequest


class AdminService:
    def __init__(self, db):
        self.db = db

    def _notify(self, user_id: int, title: str, body: str) -> None:
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
