import "server-only";
import { createClient } from "@/lib/supabase/server";

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

export async function listEnrollments(): Promise<EnrollmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, enrollment_number, status, enrollment_date, start_date, end_date, created_at, students(full_name, email), courses(name), platforms(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentRow[];
}
