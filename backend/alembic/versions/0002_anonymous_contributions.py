"""Rend contributions.author_id nullable pour permettre les contributions anonymes.

Revision ID: 0002_anonymous_contributions
Revises: 0001_initial
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_anonymous_contributions"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("contributions", "author_id", nullable=True)
    op.drop_constraint("contributions_author_id_fkey", "contributions", type_="foreignkey")
    op.create_foreign_key(
        "contributions_author_id_fkey", "contributions", "users",
        ["author_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("contributions_author_id_fkey", "contributions", type_="foreignkey")
    op.create_foreign_key(
        "contributions_author_id_fkey", "contributions", "users",
        ["author_id"], ["id"], ondelete="CASCADE",
    )
    op.alter_column("contributions", "author_id", nullable=False)
