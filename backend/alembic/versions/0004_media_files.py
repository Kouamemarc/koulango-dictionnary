"""Ajoute media_files pour héberger les images uploadées depuis l'app/le panel.

Revision ID: 0004_media_files
Revises: 0003_word_image_url
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_media_files"
down_revision = "0003_word_image_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("media_files")
