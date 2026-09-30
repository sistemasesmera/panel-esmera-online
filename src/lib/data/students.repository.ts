import "server-only";
import { createClient } from "@/lib/supabase/server";

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
