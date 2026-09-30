-- Add qualification sheet fields to lead_profiles

ALTER TABLE lead_profiles
  ADD COLUMN IF NOT EXISTS objetivo            text,
  ADD COLUMN IF NOT EXISTS horas_semana        text,
  ADD COLUMN IF NOT EXISTS cuando_empezar      text,
  ADD COLUMN IF NOT EXISTS experiencia         text,
  ADD COLUMN IF NOT EXISTS dispuesto_invertir  text,
  ADD COLUMN IF NOT EXISTS quien_decide        text,
  ADD COLUMN IF NOT EXISTS quien_otra_persona  text,
  ADD COLUMN IF NOT EXISTS dudas_objeciones    text,
  ADD COLUMN IF NOT EXISTS temperatura         text,
  ADD COLUMN IF NOT EXISTS frase_clave         text;
