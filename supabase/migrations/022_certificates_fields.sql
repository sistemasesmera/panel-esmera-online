-- ============================================================
-- Migración 022: Ampliar tabla certificates
-- ============================================================

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS student_name       text,
  ADD COLUMN IF NOT EXISTS course_name        text,
  ADD COLUMN IF NOT EXISTS hours              numeric,
  ADD COLUMN IF NOT EXISTS start_date         date,
  ADD COLUMN IF NOT EXISTS end_date           date,
  ADD COLUMN IF NOT EXISTS active             boolean not null default true,
  ADD COLUMN IF NOT EXISTS created_by         uuid references public.users(id) on delete set null;

-- Índice para búsqueda por número de certificado (usado en la API pública)
CREATE UNIQUE INDEX IF NOT EXISTS certificates_number_idx ON public.certificates(certificate_number)
  WHERE certificate_number IS NOT NULL;
