import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type EnrollmentRow = {
  id: string;
  enrollment_number: number;
  status: string;
  enrollment_date: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  students: { full_name: string; email: string } | null;
  courses: { name: string } | null;
  platforms: { name: string } | null;
};

const ENROLLMENT_SELECT = "id, enrollment_number, status, enrollment_date, start_date, end_date, created_at, students(full_name, email), courses(name), platforms(name)";

export async function listEnrollments(): Promise<EnrollmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentRow[];
}

// Filtered version for setter/closer: only enrollments where they participated
export async function listEnrollmentsForUser(userId: string): Promise<EnrollmentRow[]> {
  const db = createAdminClient() as any;

  // 1. Get contact IDs where user is setter or closer
  const { data: profiles } = await db
    .from("lead_profiles")
    .select("ghl_contact_id")
    .or(`setter_id.eq.${userId},closer_id.eq.${userId}`);

  const contactIds: string[] = (profiles ?? []).map((p: any) => p.ghl_contact_id).filter(Boolean);
  if (!contactIds.length) return [];

  // 2. Get student IDs for those contacts
  const { data: studentRows } = await db
    .from("students")
    .select("id")
    .in("ghl_contact_id", contactIds);

  const studentIds: string[] = (studentRows ?? []).map((s: any) => s.id);
  if (!studentIds.length) return [];

  // 3. Get enrollments for those students
  const { data, error } = await db
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .in("student_id", studentIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentRow[];
}
