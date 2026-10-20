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

export type CloserSales = {
  closer_id:   string | null;
  closer_name: string;
  count:       number;
  total:       number;
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
    supabase.from("contracts").select("amount, enrollments!enrollment_id(status, deleted_at)").eq("status", "firmado").gte("signed_at", monthStart) as unknown as Promise<{ data: Array<{ amount: number; enrollments: { status: string; deleted_at: string | null } | null }> | null; error: unknown }>,
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("active", true),
  ]);

  const activeContracts = (signedContracts ?? []).filter(c =>
    c.enrollments !== null &&
    c.enrollments.deleted_at === null &&
    c.enrollments.status !== "cancelada"
  );
  const revenueThisMonth = activeContracts.reduce((s, c) => s + (c.amount ?? 0), 0);
  const signedContractsThisMonth = activeContracts.length;

  return {
    totalStudents: totalStudents ?? 0,
    activeEnrollments: activeEnrollments ?? 0,
    pendingEnrollments: pendingEnrollments ?? 0,
    signedContractsThisMonth,
    revenueThisMonth,
    totalCourses: totalCourses ?? 0,
  };
}

export async function getCloserSalesThisMonth(closerId?: string): Promise<CloserSales[]> {
  const db = createAdminClient() as any;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await db
    .from("contracts")
    .select("amount, enrollments!enrollment_id(closer_id, closer_name, status, deleted_at)")
    .eq("status", "firmado")
    .gte("signed_at", monthStart);

  if (error) throw new Error(error.message);

  const SIN_CLOSER = "__sin_closer__";

  const map = new Map<string, CloserSales>();
  for (const c of (data ?? []) as Array<{ amount: number; enrollments: { closer_id: string | null; closer_name: string | null; status: string | null; deleted_at: string | null } | null }>) {
    const enr = c.enrollments;
    if (!enr || enr.status === "cancelada" || enr.deleted_at !== null) continue;
    if (closerId && enr.closer_id !== closerId) continue;

    const key  = enr.closer_id ?? (enr.closer_name ?? SIN_CLOSER);
    const name = enr.closer_name ?? "Sin closer asignado";
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += c.amount ?? 0;
    } else {
      map.set(key, { closer_id: enr.closer_id, closer_name: name, count: 1, total: c.amount ?? 0 });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.closer_name === "Sin closer asignado") return 1;
    if (b.closer_name === "Sin closer asignado") return -1;
    return b.total - a.total;
  });
}

export type CourseRevenue = {
  course_id: string | null;
  course_name: string;
  count: number;
  total: number;
};

export async function getRevenueByCourse(year: number, month: number): Promise<CourseRevenue[]> {
  const db = createAdminClient() as any;
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd   = new Date(year, month,     1).toISOString();

  const { data, error } = await db
    .from("contracts")
    .select("amount, enrollments!enrollment_id(course_id, status, deleted_at)")
    .eq("status", "firmado")
    .gte("signed_at", monthStart)
    .lt("signed_at", monthEnd);

  if (error) throw new Error(error.message);

  // Acumular importes por course_id
  const courseMap = new Map<string, { count: number; total: number }>();
  for (const c of (data ?? []) as Array<{ amount: number; enrollments: { course_id: string | null; status: string; deleted_at: string | null } | null }>) {
    const enr = c.enrollments;
    if (!enr || enr.deleted_at !== null || enr.status === "cancelada") continue;
    const key = enr.course_id ?? "__sin_curso__";
    const existing = courseMap.get(key);
    if (existing) { existing.count++; existing.total += c.amount ?? 0; }
    else           { courseMap.set(key, { count: 1, total: c.amount ?? 0 }); }
  }

  if (courseMap.size === 0) return [];

  // Resolver nombres de curso en una segunda consulta
  const courseIds = [...courseMap.keys()].filter(k => k !== "__sin_curso__");
  const { data: coursesData } = courseIds.length
    ? await db.from("courses").select("id, name").in("id", courseIds)
    : { data: [] };

  const nameMap = new Map<string, string>(
    ((coursesData ?? []) as Array<{ id: string; name: string }>).map(c => [c.id, c.name])
  );

  return [...courseMap.entries()]
    .map(([key, { count, total }]) => ({
      course_id:   key === "__sin_curso__" ? null : key,
      course_name: key === "__sin_curso__" ? "Sin curso" : (nameMap.get(key) ?? "Sin curso"),
      count,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

export type FormationRevenue = {
  formation_id: string | null;
  formation_name: string;
  count: number;
  total: number;
};

export async function getRevenueByFormation(year: number, month: number): Promise<FormationRevenue[]> {
  const db = createAdminClient() as any;
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd   = new Date(year, month,     1).toISOString();

  // Leemos formation_id Y course_id del enrollment
  const { data, error } = await db
    .from("contracts")
    .select("amount, enrollments!enrollment_id(course_id, formation_id, status, deleted_at)")
    .eq("status", "firmado")
    .gte("signed_at", monthStart)
    .lt("signed_at", monthEnd);

  if (error) throw new Error(error.message);

  type EnrRow = { course_id: string | null; formation_id: string | null; status: string; deleted_at: string | null };
  // formation_id directos (tab "Formación") y course_id indirectos (tab "Curso individual")
  const directMap = new Map<string, { count: number; total: number }>(); // formation_id → totales
  const courseMap = new Map<string, { count: number; total: number }>(); // course_id → totales (para resolver vía formation_courses)
  let sinCount = 0; let sinTotal = 0;

  for (const c of (data ?? []) as Array<{ amount: number; enrollments: EnrRow | null }>) {
    const enr = c.enrollments;
    if (!enr || enr.deleted_at !== null || enr.status === "cancelada") continue;
    const amt = c.amount ?? 0;
    if (enr.formation_id) {
      const ex = directMap.get(enr.formation_id);
      if (ex) { ex.count++; ex.total += amt; } else directMap.set(enr.formation_id, { count: 1, total: amt });
    } else if (enr.course_id) {
      const ex = courseMap.get(enr.course_id);
      if (ex) { ex.count++; ex.total += amt; } else courseMap.set(enr.course_id, { count: 1, total: amt });
    } else {
      sinCount++; sinTotal += amt;
    }
  }

  const formMap = new Map<string, FormationRevenue>();

  // Resolver nombres para formation_id directos
  const directIds = [...directMap.keys()];
  if (directIds.length > 0) {
    const { data: fData } = await db.from("formations").select("id, name").in("id", directIds);
    const nameMap = new Map<string, string>(((fData ?? []) as Array<{ id: string; name: string }>).map(f => [f.id, f.name]));
    for (const [fid, { count, total }] of directMap.entries()) {
      formMap.set(fid, { formation_id: fid, formation_name: nameMap.get(fid) ?? "Sin formación", count, total });
    }
  }

  // Resolver course_id → formación vía formation_courses
  const courseIds = [...courseMap.keys()];
  if (courseIds.length > 0) {
    const { data: fcData } = await db.from("formation_courses").select("course_id, formations(id, name)").in("course_id", courseIds);
    const courseToForm = new Map<string, { id: string; name: string }>();
    for (const fc of (fcData ?? []) as Array<{ course_id: string; formations: { id: string; name: string } | null }>) {
      if (fc.formations && !courseToForm.has(fc.course_id)) courseToForm.set(fc.course_id, fc.formations);
    }
    for (const [cid, { count, total }] of courseMap.entries()) {
      const f = courseToForm.get(cid);
      const key = f?.id ?? "__sin_formacion__";
      const ex = formMap.get(key);
      if (ex) { ex.count += count; ex.total += total; }
      else formMap.set(key, { formation_id: f?.id ?? null, formation_name: f?.name ?? "Sin formación", count, total });
    }
  }

  if (sinCount > 0) {
    const ex = formMap.get("__sin_formacion__");
    if (ex) { ex.count += sinCount; ex.total += sinTotal; }
    else formMap.set("__sin_formacion__", { formation_id: null, formation_name: "Sin formación", count: sinCount, total: sinTotal });
  }

  return [...formMap.values()].sort((a, b) => b.total - a.total);
}

export async function getCloserSalesForMonth(year: number, month: number, closerId?: string): Promise<CloserSales[]> {
  const db = createAdminClient() as any;
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 1).toISOString();

  const { data, error } = await db
    .from("contracts")
    .select("amount, enrollments!enrollment_id(closer_id, closer_name, status, deleted_at)")
    .eq("status", "firmado")
    .gte("signed_at", monthStart)
    .lt("signed_at", monthEnd);

  if (error) throw new Error(error.message);

  const SIN_CLOSER = "__sin_closer__";
  const map = new Map<string, CloserSales>();
  for (const c of (data ?? []) as Array<{ amount: number; enrollments: { closer_id: string | null; closer_name: string | null; status: string | null; deleted_at: string | null } | null }>) {
    const enr = c.enrollments;
    if (!enr || enr.status === "cancelada" || enr.deleted_at !== null) continue;
    if (closerId && enr.closer_id !== closerId) continue;
    const key = enr.closer_id ?? (enr.closer_name ?? SIN_CLOSER);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += c.amount ?? 0;
    } else {
      map.set(key, { closer_id: enr.closer_id, closer_name: enr.closer_name ?? "Sin closer asignado", count: 1, total: c.amount ?? 0 });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.closer_name === "Sin closer asignado") return 1;
    if (b.closer_name === "Sin closer asignado") return -1;
    return b.total - a.total;
  });
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
