"""Dépendances FastAPI : session, utilisateur courant, gardes de rôles."""
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.domain.enums import UserRole
from app.infrastructure.models import User
from app.infrastructure.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    creds_error = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Jeton invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise creds_error
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise creds_error

    user = UserRepository(db).get(user_id)
    if not user or not user.is_active:
        raise creds_error
    return user


def get_optional_user(
    token: str | None = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)
) -> User | None:
    """Comme get_current_user, mais renvoie None au lieu de lever 401 sans jeton.

    Utilisé pour les routes publiques (ex: contribution anonyme) qui restent
    toutefois capables d'attribuer la contribution si l'appelant est connecté.
    """
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user = UserRepository(db).get(int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    return user if user and user.is_active else None


def get_client_ip(request: Request) -> str | None:
    """Adresse IP réelle du client, en tenant compte du proxy Render (X-Forwarded-For)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# --- Hiérarchie des rôles (un admin a tous les droits d'un modérateur, etc.) ---
_ROLE_LEVEL = {UserRole.USER: 0, UserRole.MODERATOR: 1, UserRole.ADMIN: 2}


def require_role(minimum: UserRole):
    """Fabrique une dépendance exigeant au moins le rôle `minimum`."""

    def guard(user: User = Depends(get_current_user)) -> User:
        if _ROLE_LEVEL[user.role] < _ROLE_LEVEL[minimum]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Privilèges insuffisants.")
        return user

    return guard
