"""Ajoute les messages des visiteurs (contact du développeur, demandes de modérateur).

Revision ID: 0010_messages
Revises: 0009_contribution_consent
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_messages"
down_revision = "0009_contribution_consent"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("name", sa.String(120), nullable=True),
        sa.Column("contact", sa.String(200), nullable=True),
        sa.Column("region", sa.String(120), nullable=True),
        sa.Column("koulango_level", sa.String(60), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_messages_kind", "messages", ["kind"])
    op.create_index("ix_messages_ip_address", "messages", ["ip_address"])
    op.create_index("ix_messages_is_read", "messages", ["is_read"])


def downgrade() -> None:
    op.drop_index("ix_messages_is_read", table_name="messages")
    op.drop_index("ix_messages_ip_address", table_name="messages")
    op.drop_index("ix_messages_kind", table_name="messages")
    op.drop_table("messages")
