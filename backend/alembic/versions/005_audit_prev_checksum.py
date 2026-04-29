"""Add prev_checksum to audit_log for tamper-evident hash chain

Revision ID: 005
Revises: 004
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_log",
        sa.Column("prev_checksum", sa.String(64), nullable=True),
    )
    op.create_index("ix_audit_log_triage_id", "audit_log", ["triage_id"])
    op.create_index("ix_audit_log_timestamp", "audit_log", ["timestamp"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_timestamp", "audit_log")
    op.drop_index("ix_audit_log_triage_id", "audit_log")
    op.drop_column("audit_log", "prev_checksum")
