-- Link lead attachments to their derived enrollment
ALTER TABLE lead_attachments
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_attachments_enrollment
  ON lead_attachments(enrollment_id)
  WHERE enrollment_id IS NOT NULL;
