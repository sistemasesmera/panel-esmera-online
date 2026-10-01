import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookMarked, GraduationCap, Mail, Phone, Hash } from "lucide-react";
import { requireCapability } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatDate } from "@/lib/utils";
import { StudentEnrollmentActions } from "@/components/features/students/student-enrollment-actions";

export const metadata: Metadata = { title: "Ficha de alumno" };

const STATUS: Record<string, { label: string; cls: string }> = {
  pendiente_firma: { label: "Pendiente de firma", cls: "bg-amber-100 text-amber-700" },
  en_curso:        { label: "En curso",           cls: "bg-emerald-100 text-emerald-700" },
  finalizada:      { label: "Finalizada",         cls: "bg-blue-100 text-blue-700" },
  cancelada:       { label: "Cancelada",          cls: "bg-red-100 text-red-700" },
};

const AVATAR_GRADIENTS = [
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-teal-400 to-teal-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("viewStudents");
  const { id } = await params;
  const db = createAdminClient() as any;

  const [
    { data: student, error },
    { data: enrollmentsRaw },
    { data: courses },
    { data: platforms },
    { data: tutors },
    { data: formations },
  ] = await Promise.all([
    db.from("students")
      .select("id, full_name, email, phone, dni_nie, province, postal_code, birth_date, created_at, ghl_contact_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),

    db.from("enrollments")
      .select("id, enrollment_number, status, enrollment_date, setter_name, closer_name, courses!course_id(name), platforms!platform_id(name)")
      .eq("student_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    db.from("courses")
      .select("id, name, price")
      .eq("active", true)
      .order("name"),

    db.from("platforms")
      .select("id, name")
      .order("name"),

    db.from("users")
      .select("id, full_name")
      .eq("role", "tutor")
      .order("full_name"),

    db.from("formations")
      .select("id, name, formation_courses(course_id, position, courses!course_id(id, name))")
      .order("name"),
  ]);

  if (error || !student) notFound();

  // Setter/closer come from the most recent enrollment snapshot (frozen at creation)
  const latestEnrollment = (enrollmentsRaw ?? [])[0] ?? null;
  const setterName: string | null = latestEnrollment?.setter_name ?? null;
  const closerName: string | null = latestEnrollment?.closer_name ?? null;

  const enrollments = (enrollmentsRaw ?? []) as Array<{
    id: string;
    enrollment_number: number;
    status: string;
    enrollment_date: string;
    setter_name: string | null;
    closer_name: string | null;
    courses: { name: string } | null;
    platforms: { name: string } | null;
  }>;

  const coursesForModal = (courses ?? []) as Array<{ id: string; name: string; price: number | null }>;
  const gradientIdx = student.full_name.charCodeAt(0) % 5;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Alumnos
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 text-white text-base font-black bg-gradient-to-br",
              AVATAR_GRADIENTS[gradientIdx]
            )}
          >
            {initials(student.full_name)}
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight">{student.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              Alta: {formatDate(student.created_at)}
              {enrollments.length > 0 && (
                <> · <span className="font-medium text-slate-600">{enrollments.length} {enrollments.length === 1 ? "matrícula" : "matrículas"}</span></>
              )}
            </p>
          </div>
        </div>

        <StudentEnrollmentActions
          studentId={student.id}
          studentName={student.full_name}
          courses={coursesForModal}
          platforms={(platforms ?? []) as { id: string; name: string }[]}
          tutors={(tutors ?? []) as { id: string; full_name: string }[]}
          formations={(formations ?? []) as any[]}
        />
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* LEFT: enrollments */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 card-shadow">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <BookMarked className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Matrículas</h2>
              {enrollments.length > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {enrollments.length}
                </span>
              )}
            </div>

            {enrollments.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <GraduationCap className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Sin matrículas todavía.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {enrollments.map(e => {
                  const s = STATUS[e.status] ?? { label: e.status, cls: "bg-slate-100 text-slate-600" };
                  return (
                    <li key={e.id} className="group">
                      <Link
                        href={`/enrollments/${e.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-mono text-xs font-bold text-slate-400 w-10 shrink-0">
                          #{e.enrollment_number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {e.courses?.name ?? "—"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(e.enrollment_date)}
                            {e.platforms?.name && <> · {e.platforms.name}</>}
                          </p>
                          {(e.setter_name || e.closer_name) && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {e.setter_name && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 rounded-full px-1.5 py-0.5">
                                  <span className="font-black text-sky-400">S</span>{e.setter_name.split(" ")[0]}
                                </span>
                              )}
                              {e.closer_name && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60 rounded-full px-1.5 py-0.5">
                                  <span className="font-black text-violet-400">C</span>{e.closer_name.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={cn("shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full", s.cls)}>
                          {s.label}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: student data */}
        <div className="bg-white rounded-xl border border-slate-200 card-shadow p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Datos del alumno</h2>
            {(setterName || closerName) && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {setterName && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 rounded-full px-2.5 py-0.5">
                    <span className="font-black text-sky-400">S</span>{setterName}
                  </span>
                )}
                {closerName && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60 rounded-full px-2.5 py-0.5">
                    <span className="font-black text-violet-400">C</span>{closerName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <DataRow icon={<Mail className="h-3.5 w-3.5 text-slate-400" />} label="Email">
              <a href={`mailto:${student.email}`} className="text-sm text-indigo-600 hover:underline truncate">
                {student.email}
              </a>
            </DataRow>
            {student.phone && (
              <DataRow icon={<Phone className="h-3.5 w-3.5 text-slate-400" />} label="Teléfono">
                <span className="text-sm text-slate-700">{student.phone}</span>
              </DataRow>
            )}
            {student.dni_nie && (
              <DataRow icon={<Hash className="h-3.5 w-3.5 text-slate-400" />} label="DNI / NIE / Pasaporte">
                <span className="text-sm font-mono text-slate-700">{student.dni_nie}</span>
              </DataRow>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function DataRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
