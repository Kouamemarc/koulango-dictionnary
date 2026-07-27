"""Ajoute translations (traductions alternatives fr/en d'un mot).

Revision ID: 0005_translations
Revises: 0004_media_files
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_translations"
down_revision = "0004_media_files"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "translations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("word_id", sa.Integer(), sa.ForeignKey("words.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language", sa.String(10), nullable=False, server_default="fr"),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("translations")
