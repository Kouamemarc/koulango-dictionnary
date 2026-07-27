"""Déplace part_of_speech du mot (au lieu d'une définition) et ajoute un
exemple par traduction.

Revision ID: 0006_word_pos_translation_example
Revises: 0005_translations
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_pos_and_example"
down_revision = "0005_translations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("words", sa.Column("part_of_speech", sa.String(60), nullable=True))
    op.add_column("translations", sa.Column("example", sa.Text(), nullable=True))

    # Reprend la nature grammaticale depuis la première définition existante,
    # avant de supprimer la colonne (le champ était auparavant porté par Definition).
    op.execute(
        """
        UPDATE words
        SET part_of_speech = d.part_of_speech
        FROM (
            SELECT DISTINCT ON (word_id) word_id, part_of_speech
            FROM definitions
            WHERE part_of_speech IS NOT NULL
            ORDER BY word_id, id
        ) d
        WHERE d.word_id = words.id
        """
    )
    op.drop_column("definitions", "part_of_speech")


def downgrade() -> None:
    op.add_column("definitions", sa.Column("part_of_speech", sa.String(60), nullable=True))
    op.execute(
        """
        UPDATE definitions
        SET part_of_speech = w.part_of_speech
        FROM words w
        WHERE w.id = definitions.word_id
        """
    )
    op.drop_column("translations", "example")
    op.drop_column("words", "part_of_speech")
