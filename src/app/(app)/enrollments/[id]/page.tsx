import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookMarked, User } from "lucide-react";
import { requireCapability } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, fmt, formatDate } from "@/lib/utils";
import { EnrollmentDetailClient }      from "@/components/features/enrollments/enrollment-detail-client";
import { EnrollmentInfoPanel }         from "@/components/features/enrollments/enrollment-info-panel";
import { EnrollmentAttachmentsPanel }  from "@/components/features/enrollments/enrollment-attachments-panel";
import { EnrollmentTutoringPanel }     from "@/components/features/enrollments/enrollment-tutoring-panel";
import { EnrollmentActivityPanel }     from "@/components/features/enrollments/enrollment-activity-panel";
import { EnrollmentStatusActions }     from "@/components/features/enrollments/enrollment-status-actions";
import { getSessionsByEnrollment }     from "@/lib/data/tutoring.repository";

export const metadata: Metadata = { title: "Detalle de matrícula" };

const STATUS: Record<string, { label: string; cls: string }> = {
  pendiente_firma: { label: "Pendiente de firma", cls: "bg-amber-100 text-amber-700" },
  en_curso:        { label: "En curso",           cls: "bg-emerald-100 text-emerald-700" },
  finalizada:      { label: "Finalizada",         cls: "bg-blue-100 text-blue-700" },
  cancelada:       { label: "Cancelada",          cls: "bg-red-100 text-red-700" },
};

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("viewEnrollments");
  const { id } = await params;
  const db = createAdminClient() as any;

  // Fetch all data in parallel
  const [
    { data: raw, error },
    { data: platforms },
    { data: tutors },
    { data: attachmentsRaw },
    { data: activities },
    sessions,
    { data: leadAttachmentsRaw },
  ] = await Promise.all([
    db.from("enrollments").select(`
      id, enrollment_number, status, enrollment_date, start_date, end_date,
      duration_months, notes, created_at, setter_name, closer_name,
      students!student_id(id, full_name, email, phone, dni_nie, ghl_contact_id),
      courses!course_id(name, duration_hours),
      platforms!platform_id(id, name),
      assigned_tutor:users!assigned_to(id, full_name),
      contracts!enrollment_id(
        id, status, amount, payment_type, sent_at, signed_at, declined_at,
        document_url, docuseal_signing_url
      ),
      contract_events!enrollment_id(
        id, event_type, email, occurred_at, decline_reason
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single(),

    db.from("platforms").select("id, name").order("name"),
    db.from("users").select("id, full_name").eq("role", "tutor").order("full_name"),

    db.from("enrollment_attachments")
      .select("id, file_name, file_path, file_size, created_at")
      .eq("enrollment_id", id)
      .order("created_at", { ascending: false }),

    db.from("activity_logs")
      .select("id, action, details, created_at, users!user_id(full_name)")
      .eq("entity_type", "enrollment")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),

    getSessionsByEnrollment(id),

    db.from("lead_attachments")
      .select("id, file_name, file_url, file_size, created_at")
      .eq("enrollment_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !raw) notFound();

  // Setter/closer are snapshotted on the enrollment at creation — frozen, never changes
  const setterName: string | null = (raw as any)?.setter_name ?? null;
  const closerName: string | null = (raw as any)?.closer_name ?? null;

  type EnrollmentData = {
    id: string;
    enrollment_number: number;
    status: string;
    enrollment_date: string;
    start_date: string | null;
    end_date: string | null;
    duration_months: number | null;
    notes: string | null;
    created_at: string;
    setter_name: string | null;
    closer_name: string | null;
    students: { id: string; full_name: string; email: string; phone: string | null; dni_nie: string | null; ghl_contact_id: string | null } | null;
    courses: { name: string; duration_hours: number | null } | null;
    platforms: { id: string; name: string } | null;
    assigned_tutor: { id: string; full_name: string } | null;
    contracts: Array<{
      id: string; status: "borrador" | "enviado" | "firmado"; amount: number;
      payment_type: string | null; sent_at: string | null; signed_at: string | null;
      declined_at: string | null; document_url: string | null; docuseal_signing_url: string | null;
    }>;
    contract_events: Array<{
      id: string; event_type: string; email: string | null;
      occurred_at: string; decline_reason: string | null;
    }>;
  };

  const enrollment = raw as unknown as EnrollmentData;
  const contract   = enrollment.contracts?.[0] ?? null;
  const events     = [...(enrollment.contract_events ?? [])].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );
  const st = STATUS[enrollment.status] ?? { label: enrollment.status, cls: "bg-slate-100 text-slate-600" };

  // Generate signed URLs for enrollment_attachments
  const ownAttachments = await Promise.all(
    (attachmentsRaw ?? []).map(async (att: any) => {
      const { data: signed } = await db.storage
        .from("enrollment-files")
        .createSignedUrl(att.file_path, 60 * 60);
      return { ...att, signed_url: signed?.signedUrl ?? null, inherited: false };
    })
  );

  // Lead attachments already have a signed URL stored in file_url
  const inheritedAttachments = (leadAttachmentsRaw ?? []).map((att: any) => ({
    id:         att.id,
    file_name:  att.file_name,
    file_path:  "",
    file_size:  att.file_size,
    created_at: att.created_at,
    signed_url: att.file_url ?? null,
    inherited:  true,
  }));

  const attachments = [...inheritedAttachments, ...ownAttachments]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link
        href="/enrollments"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Matrículas
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 shrink-0">
            <BookMarked className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight">
              Matrícula #{enrollment.enrollment_number}
            </h1>
            <p className="text-xs text-muted-foreground">
              {formatDate(enrollment.enrollment_date)}
              {enrollment.courses?.name && (
                <> · <span className="font-medium text-slate-600">{enrollment.courses.name}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", st.cls)}>
            {st.label}
          </span>
          <EnrollmentStatusActions
            enrollmentId={enrollment.id}
            currentStatus={enrollment.status}
          />
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Student + course summary */}
          <div className="bg-white rounded-xl border border-slate-200 card-shadow p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Alumno</h2>
              </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Nombre</p>
                <p className="text-sm font-semibold text-slate-900">{enrollment.students?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Email</p>
                <p className="text-sm text-slate-700 truncate">{enrollment.students?.email ?? "—"}</p>
              </div>
              {enrollment.students?.phone && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Teléfono</p>
                  <p className="text-sm text-slate-700">{enrollment.students.phone}</p>
                </div>
              )}
              {enrollment.students?.dni_nie && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">DNI / NIE</p>
                  <p className="text-sm text-slate-700">{enrollment.students.dni_nie}</p>
                </div>
              )}
              {contract && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Importe</p>
                  <p className="text-sm font-bold text-slate-900">{fmt(contract.amount)}</p>
                </div>
              )}
              {enrollment.courses?.duration_hours && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Horas</p>
                  <p className="text-sm text-slate-700">{enrollment.courses.duration_hours} h</p>
                </div>
              )}
            </div>
          </div>

          {/* Enrollment details (editable) */}
          <EnrollmentInfoPanel
            enrollmentId={enrollment.id}
            platform={enrollment.platforms ?? null}
            tutor={enrollment.assigned_tutor ?? null}
            startDate={enrollment.start_date}
            endDate={enrollment.end_date}
            durationMonths={enrollment.duration_months}
            notes={enrollment.notes}
            platforms={(platforms ?? []) as { id: string; name: string }[]}
            tutors={(tutors ?? []) as { id: string; full_name: string }[]}
          />

          {/* Contract */}
          <EnrollmentDetailClient
            enrollmentId={enrollment.id}
            contract={contract}
            events={events}
            studentEmail={enrollment.students?.email ?? ""}
          />
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">
          <EnrollmentAttachmentsPanel
            enrollmentId={enrollment.id}
            initialAttachments={attachments}
          />

          <EnrollmentTutoringPanel
            enrollmentId={enrollment.id}
            initialSessions={sessions}
          />

          <EnrollmentActivityPanel activities={(activities ?? []) as any} />
        </div>

      </div>
    </div>
  );
}
