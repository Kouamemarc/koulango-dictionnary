"""Dépendances FastAPI : session, utilisateur courant, gardes de rôles."""
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.domain.enums import UserRole
from app.infrastructure.models import User
from app.infrastructure.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


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


# --- Hiérarchie des rôles (un admin a tous les droits d'un modérateur, etc.) ---
_ROLE_LEVEL = {UserRole.USER: 0, UserRole.MODERATOR: 1, UserRole.ADMIN: 2}


def require_role(minimum: UserRole):
    """Fabrique une dépendance exigeant au moins le rôle `minimum`."""

    def guard(user: User = Depends(get_current_user)) -> User:
        if _ROLE_LEVEL[user.role] < _ROLE_LEVEL[minimum]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Privilèges insuffisants.")
        return user

    return guard
