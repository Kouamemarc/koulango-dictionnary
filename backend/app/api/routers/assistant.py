"""Route de l'assistant conversationnel (API Claude) d'aide à l'ajout de mots."""
import anthropic
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_client_ip
from app.application.services.assistant_service import AssistantService, get_anthropic_client, rate_limiter
from app.application.services.word_service import WordService
from app.core.config import settings
from app.core.database import get_db
from app.infrastructure.repositories.word_repository import WordRepository
from app.schemas.assistant import ChatRequest, ChatResponse

router = APIRouter(prefix="/assistant", tags=["Assistant"])


def get_assistant_service(
    db: Session = Depends(get_db),
    client: anthropic.Anthropic = Depends(get_anthropic_client),
) -> AssistantService:
    return AssistantService(client, WordService(WordRepository(db)))


@router.post("/chat", response_model=ChatResponse, summary="Discuter avec l'assistant d'ajout de mot")
def chat(
    req: ChatRequest,
    svc: AssistantService = Depends(get_assistant_service),
    ip: str | None = Depends(get_client_ip),
):
    """Envoie l'historique de la conversation et renvoie la réponse de l'assistant.

    Quand l'assistant a assez d'informations, `draft` contient une proposition
    au format de POST /contributions, à faire confirmer par l'utilisateur.
    Sans état côté serveur : le client renvoie tout l'historique à chaque appel.
    Limité à ASSISTANT_RATE_LIMIT_PER_HOUR messages par IP et par heure.
    """
    rate_limiter.check(ip, settings.ASSISTANT_RATE_LIMIT_PER_HOUR)
    return svc.chat(req)
