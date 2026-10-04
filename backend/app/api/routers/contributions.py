"""Routes de contribution : vérification intelligente et proposition de mot."""
import anthropic
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_client_ip, get_optional_user
from app.application.services.assistant_service import RateLimiter, get_anthropic_client
from app.application.services.import_service import ImportService
from app.application.services.word_service import WordService
from app.core.database import get_db
from app.infrastructure.models import User
from app.infrastructure.repositories.word_repository import WordRepository
from app.schemas.imports import ImportRequest, ImportResponse
from app.schemas.word import BatchItemResult, ContributionBatch, SmartCheckResponse, WordCreate, WordSummary

router = APIRouter(prefix="/contributions", tags=["Contributions"])

# Chaque extraction appelle l'IA (payante) : plafond par IP et par heure.
IMPORT_EXTRACT_LIMIT_PER_HOUR = 10
import_rate_limiter = RateLimiter()


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


def _import_service(
    db: Session = Depends(get_db),
    client: anthropic.Anthropic = Depends(get_anthropic_client),
) -> ImportService:
    return ImportService(client, WordService(WordRepository(db)))


@router.post("/import/extract", response_model=ImportResponse, summary="Extraire des mots d'une publication")
def import_extract(
    req: ImportRequest,
    svc: ImportService = Depends(_import_service),
    ip: str | None = Depends(get_client_ip),
):
    """Texte copié et/ou captures d'une publication (ex : groupe Facebook) → mots koulango
    extraits par l'IA et comparés au dictionnaire. Rien n'est enregistré : l'utilisateur
    relit puis envoie sa sélection via POST /contributions/batch. 10 extractions / IP / heure."""
    import_rate_limiter.check(ip, IMPORT_EXTRACT_LIMIT_PER_HOUR, "Beaucoup d'imports cette dernière heure. Réessayez un peu plus tard.")
    return svc.extract(req)


@router.post("/batch", response_model=list[BatchItemResult], status_code=201, summary="Proposer plusieurs mots")
def propose_batch(
    data: ContributionBatch,
    svc: WordService = Depends(_service),
    user: User | None = Depends(get_optional_user),
    ip: str | None = Depends(get_client_ip),
):
    """Chaque mot part en modération (EN_ATTENTE_VALIDATION). Les mots déjà présents sont
    ignorés et signalés. Jusqu'à 30 mots par envoi, 60 propositions par IP sur 6h."""
    return svc.propose_batch(data.entries, user, ip)
