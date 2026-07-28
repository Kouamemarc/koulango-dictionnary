"""Ajoute l'adresse IP des contributions, pour limiter le débit anti-spam.

Revision ID: 0008_contribution_ip
Revises: 0007_translation_example_tr
Create Date: 2026-07-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_contribution_ip"
down_revision = "0007_translation_example_tr"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contributions", sa.Column("ip_address", sa.String(45), nullable=True))
    op.create_index("ix_contributions_ip_address", "contributions", ["ip_address"])


def downgrade() -> None:
    op.drop_index("ix_contributions_ip_address", table_name="contributions")
    op.drop_column("contributions", "ip_address")
