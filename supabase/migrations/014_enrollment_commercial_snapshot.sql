-- Snapshot of setter/closer at enrollment creation time — never updated after
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS setter_name text,
  ADD COLUMN IF NOT EXISTS closer_name text;
