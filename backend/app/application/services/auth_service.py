"""Cas d'usage d'authentification."""
from fastapi import HTTPException, status

from app.core.security import (
    create_access_token, create_refresh_token, hash_password, verify_password,
)
from app.infrastructure.models import User
from app.infrastructure.repositories.user_repository import UserRepository
from app.schemas.auth import TokenPair, UserCreate, UserLogin


class AuthService:
    def __init__(self, users: UserRepository):
        self.users = users

    def register(self, data: UserCreate) -> User:
        if self.users.get_by_email(data.email):
            raise HTTPException(status.HTTP_409_CONFLICT, "Email déjà utilisé.")
        if self.users.get_by_username(data.username):
            raise HTTPException(status.HTTP_409_CONFLICT, "Nom d'utilisateur déjà pris.")
        return self.users.create(
            email=data.email,
            username=data.username,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
        )

    def login(self, data: UserLogin) -> TokenPair:
        user = self.users.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides.")
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Compte désactivé.")
        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
