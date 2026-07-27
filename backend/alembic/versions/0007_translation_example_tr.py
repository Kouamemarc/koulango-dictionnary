"""Ajoute la traduction de l'exemple pour chaque traduction.

Revision ID: 0007_translation_example_tr
Revises: 0006_pos_and_example
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_translation_example_tr"
down_revision = "0006_pos_and_example"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("translations", sa.Column("example_translation", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("translations", "example_translation")
