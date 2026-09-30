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

// Filtered version for setter/closer: only students where they participated
export async function listStudentsForUser(userId: string): Promise<Student[]> {
  const db = createAdminClient() as any;

  // 1. Get contact IDs where user is setter or closer
  const { data: profiles } = await db
    .from("lead_profiles")
    .select("ghl_contact_id")
    .or(`setter_id.eq.${userId},closer_id.eq.${userId}`);

  const contactIds: string[] = (profiles ?? []).map((p: any) => p.ghl_contact_id).filter(Boolean);
  if (!contactIds.length) return [];

  // 2. Get students with those contact IDs
  const { data, error } = await db
    .from("students")
    .select("id, full_name, email, phone, dni_nie, province, created_at")
    .in("ghl_contact_id", contactIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Student[];
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
