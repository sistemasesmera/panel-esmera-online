-- Tabla de citas agendadas desde el CRM
CREATE TABLE IF NOT EXISTS citas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id      TEXT NOT NULL,
  ghl_opportunity_id  TEXT,
  contact_name        TEXT NOT NULL,
  contact_phone       TEXT,
  comercial_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  comercial_name      TEXT NOT NULL,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (status IN ('pendiente', 'completada', 'cancelada')),
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS citas_scheduled_at_idx  ON citas (scheduled_at);
CREATE INDEX IF NOT EXISTS citas_comercial_id_idx  ON citas (comercial_id);
CREATE INDEX IF NOT EXISTS citas_status_idx        ON citas (status);
CREATE INDEX IF NOT EXISTS citas_contact_idx       ON citas (ghl_contact_id);
