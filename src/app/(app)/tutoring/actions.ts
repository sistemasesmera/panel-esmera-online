"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const CONTACT_TYPES = ["llamada", "email", "videollamada"] as const;

const sessionSchema = z.object({
  enrollment_id: z.string().uuid("Selecciona una matrícula"),
  contact_type:  z.enum(CONTACT_TYPES),
  session_date:  z.string().min(1, "La fecha es requerida"),
  notes:         z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof sessionSchema>;

type ActionResult = { error: string; success?: never } | { success: true; error?: never };

export async function createTutoringSession(input: CreateSessionInput): Promise<ActionResult> {
  const user   = await requireCapability("viewEnrollments");
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = createAdminClient() as any;
  const { error } = await db.from("tutoring_sessions").insert({
    enrollment_id: parsed.data.enrollment_id,
    tutor_id:      user.id,
    contact_type:  parsed.data.contact_type,
    session_date:  parsed.data.session_date,
    notes:         parsed.data.notes ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/tutoring");
  revalidatePath("/enrollments", "layout");
  return { success: true };
}

export async function updateTutoringSession(
  id: string,
  input: Omit<CreateSessionInput, "enrollment_id">,
): Promise<ActionResult> {
  await requireCapability("viewEnrollments");
  const parsed = sessionSchema.omit({ enrollment_id: true }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = createAdminClient() as any;
  const { error } = await db.from("tutoring_sessions").update({
    contact_type: parsed.data.contact_type,
    session_date: parsed.data.session_date,
    notes:        parsed.data.notes ?? null,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tutoring");
  revalidatePath("/enrollments", "layout");
  return { success: true };
}

export async function deleteTutoringSession(id: string): Promise<ActionResult> {
  await requireCapability("viewEnrollments");
  const db = createAdminClient() as any;

  const { data: existing } = await db
    .from("tutoring_sessions")
    .select("enrollment_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("tutoring_sessions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/tutoring");
  if (existing?.enrollment_id) revalidatePath(`/enrollments/${existing.enrollment_id}`);
  return { success: true };
}
