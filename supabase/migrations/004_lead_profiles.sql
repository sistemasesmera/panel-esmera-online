-- Lead profiles: qualifying data + contract data per GHL contact

CREATE TABLE IF NOT EXISTS lead_profiles (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id  text NOT NULL UNIQUE,
  origen          text,
  pregunta_1      text,
  pregunta_2      text,
  pregunta_3      text,
  dni             text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lead_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lead_profiles_updated_at
  BEFORE UPDATE ON lead_profiles
  FOR EACH ROW EXECUTE FUNCTION update_lead_profiles_updated_at();

-- RLS
ALTER TABLE lead_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can manage lead profiles"
  ON lead_profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
