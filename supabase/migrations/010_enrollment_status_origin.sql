-- New enrollment statuses and origin field

-- 1. Drop old constraint FIRST (before touching any rows)
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;

-- 2. Migrate existing data to new status values
UPDATE enrollments SET status = 'en_curso'       WHERE status IN ('activa', 'validada');
UPDATE enrollments SET status = 'pendiente_firma' WHERE status = 'pendiente';

-- 3. Add new check constraint
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('pendiente_firma', 'en_curso', 'finalizada', 'cancelada'));

-- 4. Add origin column
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_origin_check;
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_origin_check
  CHECK (origin IN ('manual', 'web'));
