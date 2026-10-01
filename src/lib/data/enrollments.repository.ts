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
  tutor: { full_name: string } | null;
};

const ENROLLMENT_SELECT = "id, enrollment_number, status, enrollment_date, start_date, end_date, created_at, students(full_name, email), courses!course_id(name), platforms(name), tutor:users!tutor_id(full_name)";

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

// Filtered version for tutors: enrollments assigned to them via tutor_id
export async function listEnrollmentsForTutor(userId: string): Promise<EnrollmentRow[]> {
  const db = createAdminClient() as any;

  const { data, error } = await db
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("tutor_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentRow[];
}

// Filtered version for setter/closer: GHL path + direct assigned_to
export async function listEnrollmentsForUser(userId: string): Promise<EnrollmentRow[]> {
  const db = createAdminClient() as any;

  // Path A: GHL-linked enrollments (via lead_profiles)
  const { data: profiles } = await db
    .from("lead_profiles")
    .select("ghl_contact_id")
    .or(`setter_id.eq.${userId},closer_id.eq.${userId}`);

  const contactIds: string[] = (profiles ?? []).map((p: any) => p.ghl_contact_id).filter(Boolean);

  let ghlRows: EnrollmentRow[] = [];
  if (contactIds.length) {
    const { data: studentRows } = await db.from("students").select("id").in("ghl_contact_id", contactIds);
    const studentIds: string[] = (studentRows ?? []).map((s: any) => s.id);
    if (studentIds.length) {
      const { data } = await db.from("enrollments").select(ENROLLMENT_SELECT).in("student_id", studentIds).is("deleted_at", null);
      ghlRows = (data ?? []) as unknown as EnrollmentRow[];
    }
  }

  // Path B: directly assigned via setter_id or closer_id
  const { data: directData } = await db
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .or(`setter_id.eq.${userId},closer_id.eq.${userId}`)
    .is("deleted_at", null);

  const directRows = (directData ?? []) as unknown as EnrollmentRow[];

  // Merge and deduplicate
  const seen = new Set<string>();
  const merged = [...ghlRows, ...directRows].filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
