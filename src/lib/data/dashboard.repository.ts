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
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "activa").is("deleted_at", null),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "pendiente").is("deleted_at", null),
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
