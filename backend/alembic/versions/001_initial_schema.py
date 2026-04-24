"""Initial schema with all tables and append-only audit_log trigger

Revision ID: 001
Revises:
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("password_hash", sa.String(128), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_admin", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "pets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("species", sa.String(20), nullable=False),
        sa.Column("breed", sa.String(100), nullable=False),
        sa.Column("age_months", sa.Integer, nullable=False, server_default="0"),
        sa.Column("weight_kg", sa.Float, nullable=False, server_default="0"),
        sa.Column("conditions", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pets_user_id", "pets", ["user_id"])

    op.create_table(
        "triage_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("pet_id", sa.String(36), sa.ForeignKey("pets.id"), nullable=False),
        sa.Column("urgency_tier", sa.String(20), nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=False),
        sa.Column("fallback_triggered", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("explanation", sa.Text, nullable=False, server_default=""),
        sa.Column("breed_risk_note", sa.Text, nullable=True),
        sa.Column("module_outputs", postgresql.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_triage_events_pet_id", "triage_events", ["pet_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("triage_id", sa.String(36), sa.ForeignKey("triage_events.id"), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False, server_default="triage"),
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("output_hash", sa.String(64), nullable=False),
        sa.Column("model_version", sa.String(20), nullable=False),
        sa.Column("prompt_version_id", sa.String(20), nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=False),
        sa.Column("urgency_tier", sa.String(20), nullable=False),
        sa.Column("fallback_triggered", sa.Boolean, nullable=False),
        sa.Column("row_checksum", sa.String(64), nullable=False),
        sa.Column("timestamp", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # Append-only enforcement: raise exception on any UPDATE or DELETE
    op.execute("""
        CREATE OR REPLACE FUNCTION audit_log_immutable()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'Audit log is append-only. Modifications are not permitted.';
        END;
        $$;
    """)
    op.execute("""
        CREATE TRIGGER audit_log_no_update
        BEFORE UPDATE ON audit_log
        FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
    """)
    op.execute("""
        CREATE TRIGGER audit_log_no_delete
        BEFORE DELETE ON audit_log
        FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
    """)

    op.create_table(
        "config",
        sa.Column("key", sa.String(60), primary_key=True),
        sa.Column("value", sa.Text, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by", sa.String(36), nullable=True),
    )

    # Seed default config values
    op.execute("""
        INSERT INTO config (key, value) VALUES
            ('confidence_threshold', '0.6'),
            ('rate_limit_per_hour', '10'),
            ('gpt4o_timeout_seconds', '4.0'),
            ('circuit_breaker_reset_seconds', '30'),
            ('prompt_version_id', 'PROMPT_V1')
        ON CONFLICT (key) DO NOTHING;
    """)

    op.create_table(
        "vet_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("pet_owner_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vet_id", sa.String(36), nullable=True),
        sa.Column("triage_id", sa.String(36), sa.ForeignKey("triage_events.id"), nullable=True),
        sa.Column("peer_id", sa.String(120), nullable=False),
        sa.Column("signalling_token", sa.String(255), nullable=False),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="initiated"),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("call_note", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log")
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log")
    op.execute("DROP FUNCTION IF EXISTS audit_log_immutable()")
    op.drop_table("vet_sessions")
    op.drop_table("config")
    op.drop_table("audit_log")
    op.drop_table("triage_events")
    op.drop_table("pets")
    op.drop_table("users")
