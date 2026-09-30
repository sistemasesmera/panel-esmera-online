"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { error: string } | { success: true };

// ── Update enrollment info ────────────────────────────────────────────────────

export async function updateEnrollmentInfo(
  enrollmentId: string,
  data: {
    platform_id?:     string | null;
    tutor_id?:        string | null;
    start_date?:      string | null;
    end_date?:        string | null;
    duration_months?: number | null;
    notes?:           string | null;
  }
): Promise<ActionResult> {
  const user = await requireCapability("manageEnrollments");
  const db   = createAdminClient() as any;

  const { error } = await db
    .from("enrollments")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };

  // Build human-readable changes for the activity log
  const changes: Record<string, string> = {};
  const lookups: Promise<void>[] = [];

  if ("platform_id" in data) {
    if (!data.platform_id) {
      changes["Plataforma"] = "Sin plataforma";
    } else {
      lookups.push(
        db.from("platforms").select("name").eq("id", data.platform_id).single()
          .then(({ data: p }: any) => { changes["Plataforma"] = p?.name ?? data.platform_id!; })
      );
    }
  }
  if ("tutor_id" in data) {
    if (!data.tutor_id) {
      changes["Tutor"] = "Sin tutor";
    } else {
      lookups.push(
        db.from("users").select("full_name").eq("id", data.tutor_id).single()
          .then(({ data: u }: any) => { changes["Tutor"] = u?.full_name ?? data.tutor_id!; })
      );
    }
  }
  if ("start_date"      in data) changes["Fecha inicio"] = data.start_date      ?? "—";
  if ("end_date"        in data) changes["Fecha fin"]    = data.end_date        ?? "—";
  if ("duration_months" in data) changes["Duración"]     = data.duration_months ? `${data.duration_months} meses` : "—";
  if ("notes"           in data) changes["Notas"]        = data.notes
    ? (data.notes.length > 100 ? data.notes.slice(0, 100) + "…" : data.notes)
    : "—";

  await Promise.all(lookups);

  await db.from("activity_logs").insert({
    user_id:     user.id,
    action:      "enrollment.updated",
    entity_type: "enrollment",
    entity_id:   enrollmentId,
    details:     { changes },
  });

  revalidatePath(`/enrollments/${enrollmentId}`);
  return { success: true };
}

// ── Update enrollment status ──────────────────────────────────────────────────

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: "en_curso" | "finalizada" | "cancelada",
): Promise<ActionResult> {
  const user = await requireCapability("manageEnrollments");
  const db   = createAdminClient() as any;

  const { error } = await db
    .from("enrollments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };

  const STATUS_LABELS: Record<string, string> = {
    en_curso:   "En curso",
    finalizada: "Finalizada",
    cancelada:  "Cancelada",
  };

  await db.from("activity_logs").insert({
    user_id:     user.id,
    action:      "enrollment.status_changed",
    entity_type: "enrollment",
    entity_id:   enrollmentId,
    details:     { changes: { "Estado": STATUS_LABELS[status] ?? status } },
  });

  revalidatePath(`/enrollments/${enrollmentId}`);
  revalidatePath("/enrollments");
  return { success: true };
}

// ── Attachments ───────────────────────────────────────────────────────────────

const BUCKET = "enrollment-files";

async function ensureBucket(db: any) {
  const { error } = await db.storage.createBucket(BUCKET, {
    public: false,
    allowedMimeTypes: null,
    fileSizeLimit: 20 * 1024 * 1024,
  });
  // Ignore "already exists" errors
  if (error && !error.message?.toLowerCase().includes("already exist")) {
    console.warn("[ensureBucket]", error.message);
  }
}

export async function uploadEnrollmentAttachment(
  enrollmentId: string,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const user = await requireCapability("manageEnrollments");
  const db   = createAdminClient() as any;
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) return { error: "Archivo requerido" };
  if (file.size > 20 * 1024 * 1024) return { error: "El archivo no puede superar 20 MB" };

  await ensureBucket(db);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path     = `${enrollmentId}/${Date.now()}-${safeName}`;

  // Convert to Buffer — more reliable than passing File directly in Node.js
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType:  file.type || "application/octet-stream",
    upsert:       false,
  });
  if (upErr) return { error: `Error al subir archivo: ${upErr.message}` };

  const { data: row, error: dbErr } = await db
    .from("enrollment_attachments")
    .insert({
      enrollment_id: enrollmentId,
      file_name:     file.name,
      file_path:     path,
      file_size:     file.size,
      uploaded_by:   user.id,
    })
    .select("id")
    .single();

  if (dbErr) {
    // Rollback storage upload if DB insert fails
    await db.storage.from(BUCKET).remove([path]);
    return { error: `Error al guardar metadatos: ${dbErr.message}` };
  }

  await db.from("activity_logs").insert({
    user_id:     user.id,
    action:      "enrollment.attachment_added",
    entity_type: "enrollment",
    entity_id:   enrollmentId,
    details:     { file_name: file.name, file_size: file.size, attachment_id: row.id },
  }).then(() => {}, () => {});

  revalidatePath(`/enrollments/${enrollmentId}`);
  return { success: true };
}

export async function deleteEnrollmentAttachment(
  enrollmentId: string,
  attachmentId: string,
  filePath: string
): Promise<ActionResult> {
  const user = await requireCapability("manageEnrollments");
  const db   = createAdminClient() as any;

  await db.storage.from(BUCKET).remove([filePath]);

  const { error } = await db
    .from("enrollment_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) return { error: error.message };

  await db.from("activity_logs").insert({
    user_id:     user.id,
    action:      "enrollment.attachment_deleted",
    entity_type: "enrollment",
    entity_id:   enrollmentId,
    details:     { attachment_id: attachmentId },
  });

  revalidatePath(`/enrollments/${enrollmentId}`);
  return { success: true };
}
