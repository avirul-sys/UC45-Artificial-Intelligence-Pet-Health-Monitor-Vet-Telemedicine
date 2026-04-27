-- AI Pet Health Monitor — complete schema (mirrors alembic migrations 001-003)
-- Usage: psql -U uc45user -d uc45 -f init.sql

-- ---- 001: initial schema ----

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS pets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    name VARCHAR(80) NOT NULL,
    species VARCHAR(20) NOT NULL,
    breed VARCHAR(100) NOT NULL,
    age_months INTEGER NOT NULL DEFAULT 0,
    weight_kg FLOAT NOT NULL DEFAULT 0,
    conditions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_pets_user_id ON pets (user_id);

CREATE TABLE IF NOT EXISTS triage_events (
    id VARCHAR(36) PRIMARY KEY,
    pet_id VARCHAR(36) NOT NULL REFERENCES pets(id),
    urgency_tier VARCHAR(20) NOT NULL,
    confidence_score FLOAT NOT NULL,
    fallback_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    explanation TEXT NOT NULL DEFAULT '',
    breed_risk_note TEXT,
    module_outputs JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_triage_events_pet_id ON triage_events (pet_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    triage_id VARCHAR(36) NOT NULL REFERENCES triage_events(id),
    event_type VARCHAR(40) NOT NULL DEFAULT 'triage',
    input_hash VARCHAR(64) NOT NULL,
    output_hash VARCHAR(64) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    prompt_version_id VARCHAR(20) NOT NULL,
    confidence_score FLOAT NOT NULL,
    urgency_tier VARCHAR(20) NOT NULL,
    fallback_triggered BOOLEAN NOT NULL,
    row_checksum VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is append-only. Modifications are not permitted.';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE TABLE IF NOT EXISTS config (
    key VARCHAR(60) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(36)
);

INSERT INTO config (key, value) VALUES
    ('confidence_threshold', '0.6'),
    ('rate_limit_per_hour', '10'),
    ('gpt4o_timeout_seconds', '4.0'),
    ('circuit_breaker_reset_seconds', '30'),
    ('prompt_version_id', 'PROMPT_V1')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS vet_sessions (
    id VARCHAR(36) PRIMARY KEY,
    pet_owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
    vet_id VARCHAR(36),
    triage_id VARCHAR(36) REFERENCES triage_events(id),
    peer_id VARCHAR(120) NOT NULL,
    signalling_token VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'initiated',
    rating INTEGER,
    call_note TEXT
);

-- ---- 002: config_change_history ----

CREATE TABLE IF NOT EXISTS config_change_history (
    id SERIAL PRIMARY KEY,
    key VARCHAR(60) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by VARCHAR(254),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_config_change_history_key ON config_change_history (key);
CREATE INDEX IF NOT EXISTS ix_config_change_history_changed_at ON config_change_history (changed_at);

-- ---- 003: password_reset_tokens ----

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens (user_id);
