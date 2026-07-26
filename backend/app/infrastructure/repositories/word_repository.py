"""Repository des mots — implémentation SQLAlchemy + recherche floue PostgreSQL.

La recherche intelligente combine trois signaux :
  1. Égalité normalisée (mot déjà présent tel quel) ;
  2. Similarité trigram via l'extension pg_trgm (similarity, opérateur %) ;
  3. Distance d'édition via Levenshtein (extension fuzzystrmatch).

Un index GIN gin_trgm_ops sur words.normalized rend la similarité performante.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Sequence

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload

from app.domain.enums import WordStatus
from app.infrastructure.models import Word


def normalize(term: str) -> str:
    """Minuscule + suppression des accents pour comparer de façon robuste."""
    nfkd = unicodedata.normalize("NFKD", term.strip().lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


@dataclass
class SuggestionRow:
    word_id: int
    term: str
    similarity: float
    distance: int


class WordRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Lecture ---
    def get(self, word_id: int) -> Word | None:
        stmt = (
            select(Word)
            .options(
                selectinload(Word.definitions),
                selectinload(Word.examples),
                selectinload(Word.pronunciations),
                selectinload(Word.audios),
            )
            .where(Word.id == word_id)
        )
        return self.db.scalar(stmt)

    def get_by_normalized(self, normalized: str) -> Word | None:
        return self.db.scalar(select(Word).where(Word.normalized == normalized))

    def search(self, query: str, limit: int = 20) -> Sequence[Word]:
        """Recherche instantanée : préfixe + similarité trigram, mots publiés."""
        norm = normalize(query)
        stmt = (
            select(Word)
            .where(Word.status == WordStatus.PUBLISHED)
            .where(
                (Word.normalized.like(f"{norm}%"))
                | (func.similarity(Word.normalized, norm) > 0.2)
            )
            .order_by(func.similarity(Word.normalized, norm).desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def fuzzy_suggestions(
        self, term: str, threshold: float, max_distance: int, limit: int = 5
    ) -> list[SuggestionRow]:
        """Suggestions floues pour la vérification avant création.

        Utilise pg_trgm (similarity) ET Levenshtein en une seule requête SQL.
        """
        norm = normalize(term)
        sql = text(
            """
            SELECT id,
                   term,
                   similarity(normalized, :norm) AS sim,
                   levenshtein(normalized, :norm) AS dist
            FROM words
            WHERE status <> 'REFUSE'
              AND (
                    similarity(normalized, :norm) >= :threshold
                 OR levenshtein(normalized, :norm) <= :max_distance
              )
            ORDER BY sim DESC, dist ASC
            LIMIT :limit
            """
        )
        rows = self.db.execute(
            sql,
            {
                "norm": norm,
                "threshold": threshold,
                "max_distance": max_distance,
                "limit": limit,
            },
        ).all()
        return [SuggestionRow(word_id=r.id, term=r.term, similarity=float(r.sim), distance=int(r.dist)) for r in rows]

    def list_by_status(self, status: WordStatus, limit: int = 50, offset: int = 0) -> Sequence[Word]:
        stmt = (
            select(Word)
            .where(Word.status == status)
            .order_by(Word.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.scalars(stmt))

    # --- Écriture ---
    def create(self, **data) -> Word:
        data.setdefault("normalized", normalize(data["term"]))
        word = Word(**data)
        self.db.add(word)
        self.db.flush()
        return word

    def save(self) -> None:
        self.db.commit()
