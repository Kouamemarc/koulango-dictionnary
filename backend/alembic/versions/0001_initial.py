"""Migration initiale : extensions, tables et index de recherche floue.

Cette migration "bootstrap" active les extensions PostgreSQL nécessaires,
crée l'ensemble des tables à partir des métadonnées SQLAlchemy, puis ajoute
un index GIN trigram sur words.normalized pour accélérer la recherche floue.
Les migrations suivantes seront générées via `alembic revision --autogenerate`.

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-15
"""
from alembic import op

from app.core.database import Base
from app.infrastructure import models  # noqa: F401 — enregistre les tables

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extensions requises pour la recherche intelligente
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")        # similarité trigram
    op.execute("CREATE EXTENSION IF NOT EXISTS fuzzystrmatch")  # levenshtein()
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")       # normalisation

    # Création de toutes les tables déclarées dans les modèles
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)

    # Index GIN trigram pour similarity() / opérateur % performants
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_words_normalized_trgm "
        "ON words USING gin (normalized gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_words_term_trgm "
        "ON words USING gin (term gin_trgm_ops)"
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.execute("DROP INDEX IF EXISTS ix_words_term_trgm")
    op.execute("DROP INDEX IF EXISTS ix_words_normalized_trgm")
    Base.metadata.drop_all(bind=bind)
