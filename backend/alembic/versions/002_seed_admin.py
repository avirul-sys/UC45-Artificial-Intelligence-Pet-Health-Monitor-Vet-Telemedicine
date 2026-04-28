"""Seed default admin user from environment variables

Revision ID: 002
Revises: 001
Create Date: 2026-04-28
"""
import os
import uuid

import sqlalchemy as sa
from alembic import op
from passlib.context import CryptContext

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@pethealth.ai")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@UC45!")
    admin_name = os.environ.get("ADMIN_NAME", "Platform Admin")

    password_hash = _pwd_context.hash(admin_password)

    op.execute(
        sa.text(
            """
            INSERT INTO users (id, name, email, phone, password_hash, is_active, is_admin)
            VALUES (:id, :name, :email, :phone, :password_hash, true, true)
            ON CONFLICT (email) DO UPDATE SET is_admin = true, is_active = true
            """
        ).bindparams(
            id=str(uuid.uuid4()),
            name=admin_name,
            email=admin_email,
            phone="+00000000000",
            password_hash=password_hash,
        )
    )


def downgrade() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@pethealth.ai")
    op.execute(
        sa.text(
            "DELETE FROM users WHERE email = :email AND is_admin = true"
        ).bindparams(email=admin_email)
    )
