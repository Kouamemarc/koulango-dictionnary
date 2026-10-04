"""Messages des visiteurs : contacter le développeur, demander à devenir modérateur."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_client_ip, require_role
from app.core.database import get_db
from app.domain.enums import UserRole
from app.infrastructure.models import Message, User
from app.schemas.message import MessageCreate, MessageOut

router = APIRouter(tags=["Messages"])
moderator = Depends(require_role(UserRole.MODERATOR))

# Anti-spam : nombre de messages par IP sur une fenêtre glissante.
MESSAGE_RATE_LIMIT = 5
MESSAGE_RATE_WINDOW = timedelta(hours=1)


@router.post("/messages", response_model=MessageOut, status_code=201, summary="Envoyer un message")
def send_message(data: MessageCreate, db: Session = Depends(get_db), ip: str | None = Depends(get_client_ip)):
    """Public, sans compte. Limité à 5 messages par IP et par heure."""
    if ip:
        since = datetime.now(timezone.utc) - MESSAGE_RATE_WINDOW
        count = db.scalar(select(func.count(Message.id)).where(Message.ip_address == ip, Message.created_at >= since))
        if count and count >= MESSAGE_RATE_LIMIT:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de messages envoyés. Réessayez plus tard.")

    clean = lambda v: (v or "").strip() or None  # noqa: E731
    message = Message(
        kind=data.kind,
        name=clean(data.name),
        contact=clean(data.contact),
        region=clean(data.region),
        koulango_level=clean(data.koulango_level),
        body=data.body.strip(),
        ip_address=ip,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/admin/messages", response_model=list[MessageOut], summary="Messages des visiteurs")
def list_messages(limit: int = 100, offset: int = 0, db: Session = Depends(get_db), _: User = moderator):
    """Les plus récents d'abord, les non lus en tête."""
    return db.scalars(
        select(Message).order_by(Message.is_read, Message.created_at.desc(), Message.id.desc()).limit(limit).offset(offset)
    ).all()


@router.post("/admin/messages/{message_id}/read", response_model=MessageOut, summary="Marquer un message comme lu/non lu")
def mark_read(message_id: int, read: bool = True, db: Session = Depends(get_db), _: User = moderator):
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message introuvable.")
    message.is_read = read
    db.commit()
    db.refresh(message)
    return message
