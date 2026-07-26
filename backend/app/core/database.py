"""Connexion SQLAlchemy et session de base de données."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# Moteur SQLAlchemy 2.x (driver psycopg v3)
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Classe de base déclarative pour tous les modèles ORM."""


def get_db() -> Generator:
    """Dépendance FastAPI : fournit une session et la referme toujours."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
