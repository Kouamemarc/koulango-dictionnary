"""Routes d'authentification."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.application.services.auth_service import AuthService
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.infrastructure.models import User
from app.infrastructure.repositories.user_repository import UserRepository
from app.schemas.auth import RefreshRequest, TokenPair, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["Authentification"])


def _service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, svc: AuthService = Depends(_service)):
    """Inscription d'un nouvel utilisateur (rôle Utilisateur par défaut)."""
    return svc.register(data)


@router.post("/login", response_model=TokenPair)
def login(data: UserLogin, svc: AuthService = Depends(_service)):
    """Connexion : renvoie un couple access/refresh token."""
    return svc.login(data)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    """Renouvelle l'access token à partir d'un refresh token valide."""
    import jwt as _jwt
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        uid = int(payload["sub"])
    except (_jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token invalide.")
    return TokenPair(access_token=create_access_token(uid), refresh_token=create_refresh_token(uid))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    """Profil de l'utilisateur connecté."""
    return user
