-- Link GHL contacts/opportunities to internal Supabase records
-- Also adds curso de interés + importe previsto to lead_profiles

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS ghl_contact_id     text,
  ADD COLUMN IF NOT EXISTS ghl_opportunity_id text;

CREATE INDEX IF NOT EXISTS students_ghl_contact_idx ON public.students(ghl_contact_id);

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS ghl_opportunity_id text;

CREATE INDEX IF NOT EXISTS enrollments_ghl_opp_idx ON public.enrollments(ghl_opportunity_id);

-- Curso de interés y precio acordado en el lead (pre-matrícula)
ALTER TABLE public.lead_profiles
  ADD COLUMN IF NOT EXISTS curso_interes_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS importe_previsto  numeric(10,2);
