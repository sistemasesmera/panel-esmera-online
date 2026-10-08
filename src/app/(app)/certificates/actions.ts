"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createCertificateSchema } from "@/lib/domain/certificates/schema";
import {
  createCertificate,
  deactivateCertificate,
  getEnrollmentPreview,
  searchEnrollments,
  type EnrollmentPreview,
} from "@/lib/data/certificates.repository";

export async function createCertificateAction(raw: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") throw new Error("Sin permisos");

  const parsed = createCertificateSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const preview = await getEnrollmentPreview(parsed.data.enrollment_id);
  if (!preview) throw new Error("Matrícula no encontrada");

  return createCertificate(parsed.data, preview.enrollment_number, user.id);
}

export async function deactivateCertificateAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") throw new Error("Sin permisos");
  await deactivateCertificate(id);
}

export async function getEnrollmentPreviewAction(
  enrollmentId: string
): Promise<EnrollmentPreview | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") return null;
  return getEnrollmentPreview(enrollmentId);
}

export async function searchEnrollmentsAction(query: string): Promise<EnrollmentPreview[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") return [];
  if (!query || query.trim().length < 1) return [];
  return searchEnrollments(query.trim());
}
