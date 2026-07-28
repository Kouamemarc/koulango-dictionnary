"""Cas d'usage liés aux mots : recherche intelligente et contribution."""
import json
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select

from app.core.config import settings
from app.domain.enums import ContributionType, UserRole, WordStatus
from app.infrastructure.models import Contribution, Definition, Example, Pronunciation, Audio, Translation, User
from app.infrastructure.repositories.word_repository import WordRepository, normalize
from app.schemas.word import SmartCheckResponse, Suggestion, WordCreate

# Anti-spam : une même IP ne peut proposer plus de N mots/expressions par fenêtre glissante.
CONTRIBUTION_RATE_LIMIT = 10
CONTRIBUTION_RATE_WINDOW = timedelta(hours=6)


class WordService:
    def __init__(self, words: WordRepository):
        self.words = words

    def _check_rate_limit(self, ip_address: str | None) -> None:
        if not ip_address:
            return
        since = datetime.now(timezone.utc) - CONTRIBUTION_RATE_WINDOW
        count = self.words.db.scalar(
            select(func.count(Contribution.id)).where(
                Contribution.ip_address == ip_address, Contribution.created_at >= since
            )
        )
        if count and count >= CONTRIBUTION_RATE_LIMIT:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Trop de propositions depuis cette adresse ces dernières heures. Réessayez plus tard.",
            )

    def smart_check(self, term: str) -> SmartCheckResponse:
        """Vérifie si le mot existe déjà ou s'il existe des variantes proches.

        Reproduit le message :
        « Le mot n'existe pas. Avez-vous voulu dire : ... Est-ce le même mot ? »
        """
        norm = normalize(term)
        exact = self.words.get_by_normalized(norm)
        if exact:
            return SmartCheckResponse(
                exists=True,
                message=f"Le mot « {exact.term} » existe déjà dans le dictionnaire.",
                suggestions=[Suggestion(word_id=exact.id, term=exact.term, similarity=1.0, distance=0)],
            )

        rows = self.words.fuzzy_suggestions(
            term,
            threshold=settings.SIMILARITY_THRESHOLD,
            max_distance=settings.LEVENSHTEIN_MAX_DISTANCE,
        )
        suggestions = [
            Suggestion(word_id=r.word_id, term=r.term, similarity=round(r.similarity, 3), distance=r.distance)
            for r in rows
        ]
        if suggestions:
            liste = " / ".join(s.term for s in suggestions)
            msg = (
                "Le mot n'existe pas. Avez-vous voulu dire : "
                f"{liste} ? Est-ce le même mot ?"
            )
        else:
            msg = "Le mot n'existe pas. Vous pouvez le proposer."
        return SmartCheckResponse(exists=False, message=msg, suggestions=suggestions)

    def propose_word(self, data: WordCreate, author: User | None, ip_address: str | None = None) -> Contribution:
        """Crée un mot au statut EN_ATTENTE_VALIDATION + une contribution associée.

        Si des variantes proches existent et que force_create est False, on
        renvoie 409 avec les suggestions (l'utilisateur doit confirmer).
        """
        is_staff = author is not None and author.role in (UserRole.ADMIN, UserRole.MODERATOR)
        if not is_staff:
            self._check_rate_limit(ip_address)

        norm = normalize(data.term)
        if self.words.get_by_normalized(norm):
            raise HTTPException(status.HTTP_409_CONFLICT, "Ce mot existe déjà.")

        if not data.force_create:
            rows = self.words.fuzzy_suggestions(
                data.term,
                threshold=settings.SIMILARITY_THRESHOLD,
                max_distance=settings.LEVENSHTEIN_MAX_DISTANCE,
            )
            if rows:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail={
                        "message": "Des variantes proches existent. Confirmez avec force_create=true si c'est un mot différent.",
                        "suggestions": [
                            {"word_id": r.word_id, "term": r.term, "similarity": round(r.similarity, 3), "distance": r.distance}
                            for r in rows
                        ],
                    },
                )

        word = self.words.create(
            term=data.term.strip(),
            normalized=norm,
            fr_translation=data.fr_translation,
            en_translation=data.en_translation,
            part_of_speech=data.part_of_speech,
            source=data.source,
            image_url=data.image_url,
            dialect_id=data.dialect_id,
            created_by=author.id if author else None,
            status=WordStatus.PENDING,
        )
        # Sous-entités facultatives du formulaire
        for t in data.translations:
            word.translations.append(Translation(
                language=t.language, text=t.text, example=t.example, example_translation=t.example_translation,
            ))
        if data.definition:
            word.definitions.append(Definition(text=data.definition))
        if data.example:
            word.examples.append(Example(sentence=data.example, translation=data.example_translation))
        if data.pronunciation:
            word.pronunciations.append(Pronunciation(phonetic=data.pronunciation))
        if data.audio_url:
            word.audios.append(Audio(url=data.audio_url))

        contribution = Contribution(
            author_id=author.id if author else None,
            word_id=word.id,
            type=ContributionType.CREATE,
            payload=json.dumps(data.model_dump(), ensure_ascii=False),
            status=WordStatus.PENDING,
            ip_address=ip_address,
        )
        self.words.db.add(contribution)
        self.words.save()
        self.words.db.refresh(contribution)
        return contribution
