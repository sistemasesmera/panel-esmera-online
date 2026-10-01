import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TutoringRow = {
  id: string;
  session_date: string;
  contact_type: string;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
  enrollment_id: string;
  enrollments: {
    students: { full_name: string } | null;
    courses: { name: string } | null;
  } | null;
  users: { full_name: string | null } | null;
};

export type EnrollmentForTutoring = {
  id: string;
  students: { full_name: string } | null;
  courses: { name: string } | null;
};

export async function listTutoringSessions(tutorId?: string): Promise<TutoringRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tutoring_sessions")
    .select("id, enrollment_id, session_date, contact_type, notes, duration_minutes, created_at, enrollments(students(full_name), courses!course_id(name)), users:tutor_id(full_name)")
    .order("session_date", { ascending: false });
  if (tutorId) query = query.eq("tutor_id", tutorId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TutoringRow[];
}

export async function getActiveEnrollmentsForTutor(userId?: string): Promise<EnrollmentForTutoring[]> {
  const db = createAdminClient() as any;
  let query = db
    .from("enrollments")
    .select("id, students(full_name), courses!course_id(name)")
    .in("status", ["en_curso", "pendiente_firma"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("tutor_id", userId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentForTutoring[];
}

export async function getSessionsByEnrollment(enrollmentId: string): Promise<TutoringRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutoring_sessions")
    .select("id, enrollment_id, session_date, contact_type, notes, duration_minutes, created_at, enrollments(students(full_name), courses!course_id(name)), users:tutor_id(full_name)")
    .eq("enrollment_id", enrollmentId)
    .order("session_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TutoringRow[];
}
