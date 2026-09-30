-- Update contact_type constraint: llamada, email, videollamada
ALTER TABLE tutoring_sessions
  DROP CONSTRAINT IF EXISTS tutoring_sessions_contact_type_check;

ALTER TABLE tutoring_sessions
  ADD CONSTRAINT tutoring_sessions_contact_type_check
  CHECK (contact_type IN ('llamada', 'email', 'videollamada'));

-- Update default
ALTER TABLE tutoring_sessions
  ALTER COLUMN contact_type SET DEFAULT 'llamada';
