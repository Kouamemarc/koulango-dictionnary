"""Ajoute le consentement des contributeurs (publication + utilisation pour une IA koulango).

Revision ID: 0009_contribution_consent
Revises: 0008_contribution_ip
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_contribution_consent"
down_revision = "0008_contribution_ip"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contributions", sa.Column("ai_consent", sa.Boolean(), nullable=True))
    op.add_column("contributions", sa.Column("consent_version", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("contributions", "consent_version")
    op.drop_column("contributions", "ai_consent")
