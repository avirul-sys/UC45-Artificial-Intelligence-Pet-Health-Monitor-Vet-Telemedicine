"""Add prev_checksum to audit_log and enforce append-only rule

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

    # Append-only rule: block UPDATE and DELETE on audit_log
    op.execute(
        """
        CREATE RULE audit_log_no_update AS
            ON UPDATE TO audit_log DO INSTEAD NOTHING
        """
    )
    op.execute(
        """
        CREATE RULE audit_log_no_delete AS
            ON DELETE TO audit_log DO INSTEAD NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DROP RULE IF EXISTS audit_log_no_update ON audit_log")
    op.execute("DROP RULE IF EXISTS audit_log_no_delete ON audit_log")
    op.drop_column("audit_log", "prev_checksum")
