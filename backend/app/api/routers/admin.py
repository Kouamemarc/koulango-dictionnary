"""Routes d'administration / modération (rôle Modérateur minimum)."""
import anthropic
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.application.services.admin_service import AdminService
from app.application.services.assistant_service import get_anthropic_client
from app.application.services.import_service import ImportService
from app.application.services.word_service import WordService
from app.core.database import get_db
from app.domain.enums import UserRole
from app.infrastructure.models import User
from app.infrastructure.repositories.word_repository import WordRepository
from app.schemas.admin import MergeRequest, PendingContribution, ValidationRequest
from app.schemas.imports import ImportRequest, ImportResponse
from app.schemas.word import WordCreate, WordDetail, WordEdit

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


@router.post("/words", response_model=WordDetail, status_code=201, summary="Ajouter un mot (publié directement)")
def create_word(data: WordCreate, db: Session = Depends(get_db), _: User = moderator):
    """Ajout direct par un modérateur/administrateur : pas de file d'attente."""
    return AdminService(db).create_word(data)


def get_import_service(
    db: Session = Depends(get_db),
    client: anthropic.Anthropic = Depends(get_anthropic_client),
) -> ImportService:
    return ImportService(client, WordService(WordRepository(db)))


@router.post("/import/extract", response_model=ImportResponse, summary="Extraire des mots d'une publication")
def import_extract(req: ImportRequest, _: User = moderator, svc: ImportService = Depends(get_import_service)):
    """Texte copié et/ou captures d'écran d'une publication (ex : groupe Facebook) → entrées
    de dictionnaire extraites par l'IA, comparées au dictionnaire. Rien n'est enregistré :
    le modérateur relit puis publie les entrées retenues via POST /admin/words."""
    return svc.extract(req)


@router.put("/words/{word_id}", response_model=WordDetail, summary="Modifier un mot")
def update_word(word_id: int, data: WordEdit, db: Session = Depends(get_db), _: User = moderator):
    """Édition complète (champs + définitions/exemples/prononciations/audios)."""
    return AdminService(db).update_word(word_id, data)


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
