import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Student = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  dni_nie: string | null;
  province: string | null;
  created_at: string;
  enrollments_count?: number;
};

export async function listStudents(): Promise<Student[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, email, phone, dni_nie, province, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Student[];
}

// Filtered version for setter/closer: GHL path + direct assigned_to
export async function listStudentsForUser(userId: string): Promise<Student[]> {
  const db = createAdminClient() as any;

  const SELECT = "id, full_name, email, phone, dni_nie, province, created_at";

  // Path A: GHL-linked students
  const { data: profiles } = await db
    .from("lead_profiles")
    .select("ghl_contact_id")
    .or(`setter_id.eq.${userId},closer_id.eq.${userId}`);

  const contactIds: string[] = (profiles ?? []).map((p: any) => p.ghl_contact_id).filter(Boolean);

  let ghlStudents: Student[] = [];
  if (contactIds.length) {
    const { data } = await db.from("students").select(SELECT).in("ghl_contact_id", contactIds).is("deleted_at", null);
    ghlStudents = (data ?? []) as Student[];
  }

  // Path B: students via enrollments where user is setter or closer
  const { data: assigned } = await db
    .from("enrollments")
    .select("student_id")
    .or(`setter_id.eq.${userId},closer_id.eq.${userId}`)
    .is("deleted_at", null);

  const directIds: string[] = [...new Set<string>((assigned ?? []).map((e: any) => e.student_id).filter(Boolean))];

  let directStudents: Student[] = [];
  if (directIds.length) {
    const { data } = await db.from("students").select(SELECT).in("id", directIds).is("deleted_at", null);
    directStudents = (data ?? []) as Student[];
  }

  // Merge and deduplicate
  const seen = new Set<string>();
  const merged = [...ghlStudents, ...directStudents].filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function searchStudents(q: string): Promise<Student[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, email, phone, dni_nie, province, created_at")
    .is("deleted_at", null)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,dni_nie.ilike.%${q}%`)
    .order("full_name")
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as Student[];
}
