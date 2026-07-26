"""Routes d'administration / modération (rôle Modérateur minimum)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.application.services.admin_service import AdminService
from app.core.database import get_db
from app.domain.enums import UserRole
from app.infrastructure.models import User
from app.schemas.admin import MergeRequest, PendingContribution, ValidationRequest
from app.schemas.word import WordDetail

router = APIRouter(prefix="/admin", tags=["Administration"])
moderator = Depends(require_role(UserRole.MODERATOR))
admin = Depends(require_role(UserRole.ADMIN))


@router.get("/pending", response_model=list[PendingContribution], summary="Contributions en attente de validation")
def pending(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), _: User = moderator):
    return AdminService(db).list_pending(limit, offset)


@router.post("/contributions/{contribution_id}/review", summary="Accepter / refuser une contribution")
def review(contribution_id: int, req: ValidationRequest, db: Session = Depends(get_db), user: User = moderator):
    """Accepter, refuser (motif obligatoire) ou marquer fusionnée une contribution."""
    contribution = AdminService(db).review_contribution(contribution_id, req, user.id)
    return {"contribution_id": contribution.id, "status": contribution.status}


@router.post("/words/merge", response_model=WordDetail, summary="Fusionner deux mots")
def merge(req: MergeRequest, db: Session = Depends(get_db), _: User = admin):
    """Fusionne le mot source dans le mot cible (canonique). Réservé aux administrateurs."""
    return AdminService(db).merge_words(req)


@router.delete("/words/{word_id}", status_code=204, summary="Supprimer un mot")
def delete_word(word_id: int, db: Session = Depends(get_db), _: User = admin):
    from app.infrastructure.models import Word
    word = db.get(Word, word_id)
    if word:
        db.delete(word)
        db.commit()
