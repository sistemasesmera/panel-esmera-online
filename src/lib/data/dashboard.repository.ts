import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardStats = {
  totalStudents: number;
  activeEnrollments: number;
  pendingEnrollments: number;
  signedContractsThisMonth: number;
  revenueThisMonth: number;
  totalCourses: number;
};

export type ExpiringEnrollment = {
  id: string;
  enrollment_number: number;
  end_date: string;
  days_remaining: number;
  students: { full_name: string } | null;
  courses: { name: string } | null;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: totalStudents },
    { count: activeEnrollments },
    { count: pendingEnrollments },
    { data: signedContracts },
    { count: totalCourses },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "en_curso").is("deleted_at", null),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "pendiente_firma").is("deleted_at", null),
    supabase.from("contracts").select("amount").eq("status", "firmado").gte("signed_at", monthStart) as unknown as Promise<{ data: Array<{ amount: number }> | null; error: unknown }>,
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("active", true),
  ]);

  const revenueThisMonth = (signedContracts ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
  const signedContractsThisMonth = signedContracts?.length ?? 0;

  return {
    totalStudents: totalStudents ?? 0,
    activeEnrollments: activeEnrollments ?? 0,
    pendingEnrollments: pendingEnrollments ?? 0,
    signedContractsThisMonth,
    revenueThisMonth,
    totalCourses: totalCourses ?? 0,
  };
}

export async function getExpiringEnrollments(tutorId?: string): Promise<ExpiringEnrollment[]> {
  const db = createAdminClient() as any;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  let query = db
    .from("enrollments")
    .select("id, enrollment_number, end_date, students(full_name), courses!course_id(name)")
    .eq("status", "en_curso")
    .is("deleted_at", null)
    .not("end_date", "is", null)
    .lte("end_date", in30Days.toISOString().slice(0, 10))
    .order("end_date", { ascending: true });

  if (tutorId) query = query.eq("tutor_id", tutorId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const todayMs = today.getTime();
  return ((data ?? []) as any[]).map(e => ({
    ...e,
    days_remaining: Math.floor((new Date(e.end_date).getTime() - todayMs) / (1000 * 60 * 60 * 24)),
  }));
}
