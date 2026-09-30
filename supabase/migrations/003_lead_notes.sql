-- Lead notes & activity (linked to GHL contacts by contact ID)

CREATE TABLE IF NOT EXISTS lead_notes (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id      text NOT NULL,
  ghl_opportunity_id  text,
  type                text NOT NULL CHECK (type IN ('llamada','no_contesto','whatsapp','email','nota')),
  content             text NOT NULL DEFAULT '',
  created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_contact
  ON lead_notes(ghl_contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_attachments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id  text NOT NULL,
  note_id         uuid REFERENCES lead_notes(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_url        text NOT NULL,
  file_size       integer,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_contact
  ON lead_attachments(ghl_contact_id, created_at DESC);
