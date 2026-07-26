"""Routes de consultation et de recherche des mots."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.repositories.word_repository import WordRepository
from app.schemas.word import WordDetail, WordSummary

router = APIRouter(prefix="/words", tags=["Mots"])


@router.get("/search", response_model=list[WordSummary], summary="Recherche instantanée")
def search(
    q: str = Query(min_length=1, description="Terme recherché"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    """Recherche instantanée (préfixe + similarité trigram) parmi les mots publiés."""
    return WordRepository(db).search(q, limit)


@router.get("/{word_id}", response_model=WordDetail, summary="Fiche détaillée d'un mot")
def get_word(word_id: int, db: Session = Depends(get_db)):
    """Fiche complète : traductions, définitions, exemples, prononciation, audio."""
    word = WordRepository(db).get(word_id)
    if not word:
        raise HTTPException(404, "Mot introuvable.")
    return word
