import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateCertificateInput } from "@/lib/domain/certificates/schema";

function generateCertNumber(enrollmentNumber: number): string {
  const prefix = randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F9C2"
  return `${prefix}-${enrollmentNumber}`;                      // e.g. "A3F9C2-20067"
}

export type CertificateRow = {
  id: string;
  certificate_number: string;
  enrollment_id: string;
  student_name: string;
  course_name: string;
  hours: number | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  issued_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type EnrollmentPreview = {
  id: string;
  enrollment_number: number;
  student_name: string;
  course_name: string;
  hours: number | null;
  start_date: string | null;
  end_date: string | null;
};

const CERT_SELECT =
  "id, certificate_number, enrollment_id, student_name, course_name, hours, start_date, end_date, active, issued_at, created_by, created_at";

export async function listCertificates(): Promise<CertificateRow[]> {
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("certificates")
    .select(CERT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CertificateRow[]).filter(c => c.certificate_number != null);
}

export async function getCertificateByNumber(
  certificateNumber: string
): Promise<CertificateRow | null> {
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("certificates")
    .select(CERT_SELECT)
    .eq("certificate_number", certificateNumber)
    .single();
  if (error) return null;
  return data as CertificateRow;
}

export async function getEnrollmentPreview(
  enrollmentId: string
): Promise<EnrollmentPreview | null> {
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("enrollments")
    .select(
      "id, enrollment_number, start_date, end_date, students!student_id(full_name), courses!course_id(name, duration_hours)"
    )
    .eq("id", enrollmentId)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    enrollment_number: data.enrollment_number,
    student_name: data.students?.full_name ?? "",
    course_name: data.courses?.name ?? "",
    hours: data.courses?.duration_hours ?? null,
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
  };
}

export async function searchEnrollments(query: string): Promise<EnrollmentPreview[]> {
  const db = createAdminClient() as any;
  const num = parseInt(query, 10);

  let q = db
    .from("enrollments")
    .select(
      "id, enrollment_number, start_date, end_date, students!student_id(full_name), courses!course_id(name, duration_hours)"
    )
    .is("deleted_at", null)
    .limit(10);

  if (!isNaN(num)) {
    q = q.eq("enrollment_number", num);
  } else {
    q = q.ilike("students.full_name", `%${query}%`);
  }

  const { data, error } = await q.order("enrollment_number", { ascending: false });
  if (error || !data) return [];

  return (data as any[])
    .filter((e) => e.students)
    .map((e) => ({
      id: e.id,
      enrollment_number: e.enrollment_number,
      student_name: e.students?.full_name ?? "",
      course_name: e.courses?.name ?? "",
      hours: e.courses?.duration_hours ?? null,
      start_date: e.start_date ?? null,
      end_date: e.end_date ?? null,
    }));
}

export async function createCertificate(
  input: CreateCertificateInput,
  enrollmentNumber: number,
  createdBy: string
): Promise<CertificateRow> {
  const db = createAdminClient() as any;
  const certificateNumber = generateCertNumber(enrollmentNumber);

  const { data, error } = await db
    .from("certificates")
    .insert({
      enrollment_id:      input.enrollment_id,
      certificate_number: certificateNumber,
      student_name:       input.student_name,
      course_name:        input.course_name,
      hours:              input.hours ?? null,
      start_date:         input.start_date ?? null,
      end_date:           input.end_date ?? null,
      active:             true,
      status:             "emitido",
      issued_at:          new Date().toISOString(),
      created_by:         createdBy,
    })
    .select(CERT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as CertificateRow;
}

export async function deactivateCertificate(id: string): Promise<void> {
  const db = createAdminClient() as any;
  const { error } = await db
    .from("certificates")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
