"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createEnrollmentFromStudent(
  studentId: string,
  courseId: string,
  amount: number,
  paymentType: "contado" | "financiado",
  paymentOption: string,
): Promise<{ success: true; enrollmentNumber: number; enrollmentId: string } | { error: string }> {
  const user = await requireCapability("manageEnrollments");
  const db = createAdminClient() as any;

  if (!courseId)           return { error: "Selecciona un curso" };
  if (!amount || amount <= 0) return { error: "El importe debe ser mayor que 0" };
  if (!paymentOption)      return { error: "Selecciona el método de pago" };

  // 1. Create enrollment
  const { data: enrollment, error: enrollErr } = await db
    .from("enrollments")
    .insert({
      student_id:  studentId,
      course_id:   courseId,
      status:      "pendiente_firma",
      origin:      "manual",
      assigned_to: user.id,
    })
    .select("id, enrollment_number")
    .single();

  if (enrollErr) return { error: `Error al crear matrícula: ${enrollErr.message}` };
  const { id: enrollmentId, enrollment_number } = enrollment as { id: string; enrollment_number: number };

  // 2. Create contract
  const { error: contractErr } = await db.from("contracts").insert({
    enrollment_id:   enrollmentId,
    amount,
    status:          "borrador",
    payment_type:    paymentType,
    cash_method:     paymentType === "contado"    ? paymentOption : null,
    cash_amount:     paymentType === "contado"    ? amount        : null,
    financer:        paymentType === "financiado" ? paymentOption : null,
    financed_amount: paymentType === "financiado" ? amount        : null,
  });

  if (contractErr) return { error: `Error al crear contrato: ${contractErr.message}` };

  // 3. Activity log
  await db.from("activity_logs").insert({
    user_id:     user.id,
    action:      "enrollment.created",
    entity_type: "enrollment",
    entity_id:   enrollmentId,
    details:     { enrollment_number, student_id: studentId, amount, payment_type: paymentType },
  }).then(() => {}, () => {});

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/enrollments");
  return { success: true, enrollmentNumber: enrollment_number, enrollmentId };
}
