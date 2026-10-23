-- ============================================================
-- Migración 023: Permitir certificados manuales (sin matrícula)
-- ============================================================

ALTER TABLE public.certificates
  ALTER COLUMN enrollment_id DROP NOT NULL;
