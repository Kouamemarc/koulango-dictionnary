"""Routes de contribution : vérification intelligente et proposition de mot."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_client_ip, get_optional_user
from app.application.services.word_service import WordService
from app.core.database import get_db
from app.infrastructure.models import User
from app.infrastructure.repositories.word_repository import WordRepository
from app.schemas.word import SmartCheckResponse, WordCreate, WordSummary

router = APIRouter(prefix="/contributions", tags=["Contributions"])


def _service(db: Session = Depends(get_db)) -> WordService:
    return WordService(WordRepository(db))


@router.get("/check", response_model=SmartCheckResponse, summary="Vérification intelligente avant ajout")
def smart_check(
    term: str = Query(min_length=1, description="Mot à vérifier"),
    svc: WordService = Depends(_service),
):
    """Recherche floue (Levenshtein + pg_trgm) : le mot existe-t-il déjà / une variante ?"""
    return svc.smart_check(term)


@router.post("", response_model=WordSummary, status_code=201, summary="Proposer un nouveau mot")
def propose(
    data: WordCreate,
    svc: WordService = Depends(_service),
    user: User | None = Depends(get_optional_user),
    ip: str | None = Depends(get_client_ip),
):
    """Enregistre le mot au statut EN_ATTENTE_VALIDATION.

    Accessible sans compte : la contribution est anonyme sauf si l'appelant
    est authentifié. Si des variantes proches existent et `force_create` est
    false, renvoie 409 avec la liste des suggestions à confirmer.

    Limité à 10 propositions par IP sur 6h (anti-spam), sauf pour un
    modérateur/administrateur authentifié.
    """
    contribution = svc.propose_word(data, user, ip)
    word = WordRepository(svc.words.db).get(contribution.word_id)
    return word
