-- Add setter_id and closer_id as direct FK references on enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS setter_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closer_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS enrollments_setter_idx ON public.enrollments(setter_id);
CREATE INDEX IF NOT EXISTS enrollments_closer_idx ON public.enrollments(closer_id);
