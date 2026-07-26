"""Ajoute words.image_url pour l'illustration de chaque mot.

Revision ID: 0003_word_image_url
Revises: 0002_anonymous_contributions
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_word_image_url"
down_revision = "0002_anonymous_contributions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("words", sa.Column("image_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("words", "image_url")
