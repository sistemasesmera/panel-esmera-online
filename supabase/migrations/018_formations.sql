-- ── Formaciones ───────────────────────────────────────────────────────────────
-- Una formación agrupa varios cursos bajo un nombre comercial (ej: "Instagram Pro")
-- La matrícula puede ser de un curso suelto O de una formación completa.

CREATE TABLE formations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cursos que componen cada formación (ordenados por position)
CREATE TABLE formation_courses (
  formation_id  UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id)    ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (formation_id, course_id)
);

-- course_id pasa a ser nullable (matrícula puede ser de formación en vez de curso suelto)
ALTER TABLE enrollments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE enrollments ADD COLUMN formation_id UUID REFERENCES formations(id);

-- Tutor por curso dentro de una matrícula de formación
CREATE TABLE enrollment_course_tutors (
  enrollment_id  UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES courses(id),
  tutor_id       UUID REFERENCES auth.users(id),
  PRIMARY KEY (enrollment_id, course_id)
);

-- RLS
ALTER TABLE formations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_courses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_course_tutors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read formations"
  ON formations FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write formations"
  ON formations FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated read formation_courses"
  ON formation_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write formation_courses"
  ON formation_courses FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated read enrollment_course_tutors"
  ON enrollment_course_tutors FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write enrollment_course_tutors"
  ON enrollment_course_tutors FOR ALL TO authenticated USING (true);
