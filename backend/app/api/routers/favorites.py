"""Routes des favoris et de l'historique."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.infrastructure.models import Favorite, SearchHistory, User, Word
from app.schemas.word import WordSummary

router = APIRouter(prefix="/me", tags=["Favoris & historique"])


@router.post("/favorites/{word_id}", status_code=201)
def add_favorite(word_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Word, word_id):
        raise HTTPException(404, "Mot introuvable.")
    if db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.word_id == word_id)):
        return {"detail": "Déjà en favori."}
    db.add(Favorite(user_id=user.id, word_id=word_id))
    db.commit()
    return {"detail": "Ajouté aux favoris."}


@router.delete("/favorites/{word_id}", status_code=204)
def remove_favorite(word_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.word_id == word_id))
    if fav:
        db.delete(fav)
        db.commit()


@router.get("/favorites", response_model=list[WordSummary])
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Word).join(Favorite, Favorite.word_id == Word.id).where(Favorite.user_id == user.id)
    return list(db.scalars(stmt))


@router.get("/history", response_model=list[str])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = (
        select(SearchHistory.query)
        .where(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(50)
    )
    return list(db.scalars(stmt))
