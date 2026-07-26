"""Cas d'usage liés aux mots : recherche intelligente et contribution."""
import json

from fastapi import HTTPException, status

from app.core.config import settings
from app.domain.enums import ContributionType, WordStatus
from app.infrastructure.models import Contribution, Definition, Example, Pronunciation, Audio, User
from app.infrastructure.repositories.word_repository import WordRepository, normalize
from app.schemas.word import SmartCheckResponse, Suggestion, WordCreate


class WordService:
    def __init__(self, words: WordRepository):
        self.words = words

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

    def propose_word(self, data: WordCreate, author: User) -> Contribution:
        """Crée un mot au statut EN_ATTENTE_VALIDATION + une contribution associée.

        Si des variantes proches existent et que force_create est False, on
        renvoie 409 avec les suggestions (l'utilisateur doit confirmer).
        """
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
            source=data.source,
            dialect_id=data.dialect_id,
            created_by=author.id,
            status=WordStatus.PENDING,
        )
        # Sous-entités facultatives du formulaire
        if data.definition:
            word.definitions.append(Definition(text=data.definition))
        if data.example:
            word.examples.append(Example(sentence=data.example))
        if data.pronunciation:
            word.pronunciations.append(Pronunciation(phonetic=data.pronunciation))
        if data.audio_url:
            word.audios.append(Audio(url=data.audio_url))

        contribution = Contribution(
            author_id=author.id,
            word_id=word.id,
            type=ContributionType.CREATE,
            payload=json.dumps(data.model_dump(), ensure_ascii=False),
            status=WordStatus.PENDING,
        )
        self.words.db.add(contribution)
        self.words.save()
        self.words.db.refresh(contribution)
        return contribution
