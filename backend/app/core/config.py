"""Configuration centralisée de l'application (variables d'environnement)."""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres chargés depuis l'environnement / le fichier .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Application ---
    APP_NAME: str = "Koulango Dictionary API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # --- Base de données ---
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://koulango:koulango@db:5432/koulango"
    )

    # --- Sécurité / JWT ---
    SECRET_KEY: str = Field(default="change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 jours

    # --- CORS ---
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # --- Recherche floue ---
    # Seuil de similarité trigram (0 = tout, 1 = identique)
    SIMILARITY_THRESHOLD: float = 0.3
    # Distance de Levenshtein maximale pour proposer une variante
    LEVENSHTEIN_MAX_DISTANCE: int = 3

    # --- Stockage objet (audio / images) : Supabase ou Cloudflare R2 ---
    STORAGE_PROVIDER: str = "local"  # local | supabase | r2
    STORAGE_BUCKET: str = "koulango-media"
    STORAGE_PUBLIC_URL: str = ""


@lru_cache
def get_settings() -> Settings:
    """Instance mise en cache pour éviter de relire l'environnement à chaque appel."""
    return Settings()


settings = get_settings()
