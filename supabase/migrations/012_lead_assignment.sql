-- Lead assignment: setter + closer per lead
ALTER TABLE lead_profiles
  ADD COLUMN IF NOT EXISTS setter_id   uuid,
  ADD COLUMN IF NOT EXISTS setter_name text,
  ADD COLUMN IF NOT EXISTS closer_id   uuid,
  ADD COLUMN IF NOT EXISTS closer_name text;

CREATE INDEX IF NOT EXISTS lead_profiles_setter_id_idx ON lead_profiles (setter_id);
CREATE INDEX IF NOT EXISTS lead_profiles_closer_id_idx ON lead_profiles (closer_id);
