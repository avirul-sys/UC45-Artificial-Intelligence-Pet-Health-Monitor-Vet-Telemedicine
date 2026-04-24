"""Add config_change_history table

Revision ID: 002
Revises: 001
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "config_change_history",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(60), nullable=False),
        sa.Column("old_value", sa.Text, nullable=True),
        sa.Column("new_value", sa.Text, nullable=False),
        sa.Column("changed_by", sa.String(254), nullable=True),
        sa.Column("changed_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_config_change_history_key", "config_change_history", ["key"])
    op.create_index("ix_config_change_history_changed_at", "config_change_history", ["changed_at"])


def downgrade() -> None:
    op.drop_index("ix_config_change_history_changed_at", "config_change_history")
    op.drop_index("ix_config_change_history_key", "config_change_history")
    op.drop_table("config_change_history")
