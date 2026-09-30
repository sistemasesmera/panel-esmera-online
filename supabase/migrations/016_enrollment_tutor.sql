-- Add tutor assignment to enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS tutor_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS enrollments_tutor_idx ON public.enrollments(tutor_id);
