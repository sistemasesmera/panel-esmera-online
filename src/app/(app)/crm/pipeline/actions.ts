"use server";

import { requireCapability } from "@/lib/auth/require-role";
import { requireAuth } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateGhlOpportunity, updateGhlContact, createGhlContact, createGhlOpportunity } from "@/lib/ghl/api";
import { normalizePhone } from "@/lib/utils/phone";
import type { NoteType } from "@/lib/data/lead-notes.repository";
import { LOST_REASONS, type LostReason, UNQUALIFIED_REASONS, type UnqualifiedReason } from "@/lib/domain/crm/lead-status";

export async function moveOppToStage(
  oppId:         string,
  stageId:       string,
  contactId?:    string,
  fromStageName?: string,
  toStageName?:   string,
) {
  await requireCapability("viewPipeline");
  const user = await requireAuth();

  try {
    await updateGhlOpportunity(oppId, { pipelineStageId: stageId });
  } catch (err: any) {
    return { error: `Error al mover etapa: ${err.message}` };
  }

  if (contactId && toStageName) {
    const db = createAdminClient() as any;
    const from = fromStageName ? `${fromStageName} → ` : "";
    try {
      await db.from("lead_notes").insert({
        ghl_contact_id:     contactId,
        ghl_opportunity_id: oppId,
        type:               "nota",
        content:            `📍 Etapa cambiada: ${from}${toStageName}`,
        created_by:         user.id,
      });
    } catch { /* non-blocking */ }
  }

  return { success: true };
}

export async function markLeadAsUnqualified(
  oppId: string,
  contactId: string,
  reason: UnqualifiedReason,
  _stageId?: string  // unused — status managed in CRM only, not GHL
) {
  await requireCapability("viewPipeline");
  const user = await requireAuth();
  const db = createAdminClient() as any;

  const reasonLabel = UNQUALIFIED_REASONS.find(r => r.value === reason)?.label ?? reason;

  const { error: noteErr } = await db.from("lead_notes").insert({
    ghl_contact_id:     contactId,
    ghl_opportunity_id: oppId,
    type:               "nota",
    content:            `⚫ Lead marcado como no cualificado\nMotivo: ${reasonLabel}`,
    created_by:         user.id,
  });

  if (noteErr) return { error: noteErr.message };
  return { success: true };
}

export async function markLeadAsLost(
  oppId: string,
  contactId: string,
  reason: LostReason,
  _stageId?: string  // unused — status managed in CRM only, not GHL
) {
  await requireCapability("viewPipeline");
  const user = await requireAuth();
  const db = createAdminClient() as any;

  const reasonLabel = LOST_REASONS.find(r => r.value === reason)?.label ?? reason;

  const { error: noteErr } = await db.from("lead_notes").insert({
    ghl_contact_id:     contactId,
    ghl_opportunity_id: oppId,
    type:               "nota",
    content:            `🔴 Lead marcado como perdido\nMotivo: ${reasonLabel}`,
    created_by:         user.id,
  });

  if (noteErr) return { error: noteErr.message };
  return { success: true };
}

export async function upsertLeadProfile(
  contactId: string,
  data: {
    origen?:              string;
    pregunta_1?:          string;
    pregunta_2?:          string;
    pregunta_3?:          string;
    dni?:                 string;
    objetivo?:            string;
    horas_semana?:        string;
    cuando_empezar?:      string;
    experiencia?:         string | null;
    dispuesto_invertir?:  string | null;
    quien_decide?:        string | null;
    quien_otra_persona?:  string;
    dudas_objeciones?:    string;
    temperatura?:         string | null;
    frase_clave?:         string;
    curso_interes_id?:    string | null;
    importe_previsto?:    number | null;
  },
  oppId?: string,
  logMessage?: string,
) {
  await requireCapability("viewPipeline");
  const user = await requireAuth();
  const db   = createAdminClient() as any;

  const { error } = await db.from("lead_profiles").upsert(
    { ghl_contact_id: contactId, ...data },
    { onConflict: "ghl_contact_id" }
  );

  if (error) return { error: error.message };

  // Sync importe_previsto → GHL monetaryValue
  if (oppId && typeof data.importe_previsto === "number") {
    try {
      await updateGhlOpportunity(oppId, { monetaryValue: data.importe_previsto });
    } catch { /* non-blocking */ }
  }

  // Log activity
  if (logMessage) {
    try {
      await db.from("lead_notes").insert({
        ghl_contact_id:     contactId,
        ghl_opportunity_id: oppId ?? null,
        type:               "nota",
        content:            logMessage,
        created_by:         user.id,
      });
    } catch { /* non-blocking */ }
  }

  return { success: true };
}

export async function generateEnrollment(
  oppId:              string,
  contactId:          string,
  contact:            { name: string; email: string; phone: string | null },
  dni:                string | null,
  courseId:           string,
  amount:             number,
  paymentType:        "contado" | "financiado",
  paymentOption:      string,
  matriculadoStageId?: string,
): Promise<{ success: true; enrollmentNumber: number; enrollmentId: string } | { error: string }> {
  await requireCapability("viewPipeline");
  const user = await requireAuth();
  const db   = createAdminClient() as any;

  if (!courseId)      return { error: "Selecciona un curso" };
  if (!amount || amount <= 0) return { error: "El importe debe ser mayor que 0" };
  if (!paymentOption) return { error: "Selecciona el método de pago" };

  // 1. Find or create student
  let studentId: string;
  const { data: existing } = await db
    .from("students")
    .select("id")
    .eq("email", contact.email)
    .maybeSingle();

  if (existing) {
    studentId = existing.id;
    // Update dni_nie if we have it and it wasn't set before
    if (dni) {
      await db.from("students").update({
        dni_nie:            dni,
        ghl_contact_id:     contactId,
        ghl_opportunity_id: oppId,
        updated_at:         new Date().toISOString(),
      }).eq("id", studentId);
    }
  } else {
    const { data: newStudent, error: studentErr } = await db
      .from("students")
      .insert({
        full_name:          contact.name,
        email:              contact.email,
        phone:              contact.phone ?? null,
        dni_nie:            dni ?? null,
        ghl_contact_id:     contactId,
        ghl_opportunity_id: oppId,
      })
      .select("id")
      .single();

    if (studentErr) return { error: `Error al crear alumno: ${studentErr.message}` };
    studentId = (newStudent as { id: string }).id;
  }

  // 2. Create enrollment (activa — money is already in)
  const { data: enrollment, error: enrollErr } = await db
    .from("enrollments")
    .insert({
      student_id:         studentId,
      course_id:          courseId,
      status:             "pendiente_firma",
      origin:             "manual",
      ghl_opportunity_id: oppId,
      assigned_to:        user.id,
    })
    .select("id, enrollment_number")
    .single();

  if (enrollErr) return { error: `Error al crear matrícula: ${enrollErr.message}` };
  const { id: enrollmentId, enrollment_number } = enrollment as { id: string; enrollment_number: number };

  // 3. Create contract with payment method
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

  // 4. Inherit lead attachments → stamp enrollment_id (non-blocking)
  try {
    await db.from("lead_attachments")
      .update({ enrollment_id: enrollmentId })
      .eq("ghl_contact_id", contactId)
      .is("enrollment_id", null);
  } catch (err: any) {
    console.error("[lead attachments inherit]", err.message);
  }

  // 6. Update GHL → monetaryValue + move to Matriculado stage if provided
  try {
    await updateGhlOpportunity(oppId, {
      monetaryValue:   amount,
      ...(matriculadoStageId ? { pipelineStageId: matriculadoStageId } : {}),
    });
  } catch (err: any) {
    console.error("[GHL update on enrollment]", err.message);
  }

  // 5. Activity note
  await db.from("lead_notes").insert({
    ghl_contact_id:     contactId,
    ghl_opportunity_id: oppId,
    type:               "nota",
    content:            `✅ Matrícula #${enrollment_number} generada.\nAlumno: ${contact.name}\nImporte: ${amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}\nPago: ${paymentType === "contado" ? "Contado" : "Financiado"} · ${paymentOption}`,
    created_by:         user.id,
  });

  return { success: true, enrollmentNumber: enrollment_number, enrollmentId };
}

export async function scheduleAppointment(
  oppId:         string,
  contactId:     string,
  contactName:   string,
  contactPhone:  string | null,
  startISO:      string,
  comercialId:   string,
  comercialName: string,
  notes:         string,
  stageId?:      string,
): Promise<{ success: true } | { error: string }> {
  await requireCapability("viewPipeline");
  const user = await requireAuth();
  const db   = createAdminClient() as any;

  const startDate = new Date(startISO);

  // 1. Store in citas table
  const { error: citaErr } = await db.from("citas").insert({
    ghl_contact_id:     contactId,
    ghl_opportunity_id: oppId,
    contact_name:       contactName,
    contact_phone:      contactPhone ?? null,
    comercial_id:       comercialId  || null,
    comercial_name:     comercialName,
    scheduled_at:       startDate.toISOString(),
    notes:              notes || null,
    status:             "pendiente",
    created_by:         user.id,
  });
  if (citaErr) return { error: citaErr.message };

  // 2. Move stage to "Cita agendada"
  if (stageId) {
    try {
      await updateGhlOpportunity(oppId, { pipelineStageId: stageId });
    } catch { /* non-blocking */ }
  }

  // 3. Activity log
  const label = startDate.toLocaleString("es-ES", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
  const lines = [`📅 Cita agendada · ${label}`];
  if (comercialName) lines.push(`Comercial: ${comercialName}`);
  if (notes)         lines.push(notes);

  await db.from("lead_notes").insert({
    ghl_contact_id:     contactId,
    ghl_opportunity_id: oppId,
    type:               "nota",
    content:            lines.join("\n"),
    created_by:         user.id,
  });

  return { success: true };
}

export async function updateCitaStatus(
  citaId: string,
  status: "completada" | "cancelada",
): Promise<{ success: true } | { error: string }> {
  await requireCapability("viewPipeline");
  const db = createAdminClient() as any;
  const { error } = await db.from("citas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", citaId);
  if (error) return { error: error.message };
  return { success: true };
}

// ── Activity ──────────────────────────────────────────────────────────────────

const BUCKET = "lead-files";
const NOTE_TYPES = ["llamada", "no_contesto", "whatsapp", "email", "nota"] as const;

async function ensureLeadFilesBucket() {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
  });
  if (error && !error.message.toLowerCase().includes("already exist")) {
    console.warn("[lead-files bucket]", error.message);
  }
}

export async function createLeadActivity(fd: FormData) {
  await requireCapability("viewPipeline");
  const user = await requireAuth();
  const db = createAdminClient() as any;
  const supabase = createAdminClient();

  const contactId = (fd.get("contactId") as string)?.trim();
  const oppId     = (fd.get("oppId")     as string)?.trim() || null;
  const type      = (fd.get("type")      as string)?.trim() as NoteType;
  const content   = (fd.get("content")   as string)?.trim() ?? "";
  const files     = fd.getAll("files") as File[];

  if (!contactId) return { error: "contactId requerido" };
  if (!NOTE_TYPES.includes(type as any)) return { error: "Tipo de actividad no válido" };
  if (!content && files.length === 0) return { error: "Añade un texto o al menos un adjunto" };

  // Auto-label attachment-only notes
  const finalContent = !content && files.length > 0
    ? `📎 ${files.map(f => f.name).join(", ")}`
    : content;

  const { data: note, error: noteErr } = await db
    .from("lead_notes")
    .insert({
      ghl_contact_id:     contactId,
      ghl_opportunity_id: oppId,
      type,
      content:            finalContent,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (noteErr) return { error: noteErr.message };
  const noteId = (note as { id: string }).id;

  if (files.length > 0) {
    await ensureLeadFilesBucket();

    for (const file of files) {
      if (!file || file.size === 0) continue;

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${contactId}/${Date.now()}-${safeName}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (upErr) { console.error("[lead attachment upload]", upErr.message); continue; }

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      await db.from("lead_attachments").insert({
        ghl_contact_id: contactId,
        note_id:        noteId,
        file_name:      file.name,
        file_url:       signed?.signedUrl ?? path,
        file_size:      file.size,
        created_by:     user.id,
      });
    }
  }

  return { success: true };
}

export async function createLead(
  pipelineId:      string,
  firstStageId:    string,
  name:            string,
  email:           string | null,
  phone:           string | null,
  courseName:      string | null,
): Promise<{ success: true; contactId: string; oppId: string } | { error: string }> {
  await requireCapability("viewPipeline");

  if (!name.trim()) return { error: "El nombre es obligatorio" };

  // Normalize phone — only send if it resolves to E.164 (+...)
  const normalizedPhone = phone?.trim() ? normalizePhone(phone.trim()) : null;
  const validPhone = normalizedPhone?.startsWith("+") ? normalizedPhone : undefined;

  const cursoFieldId  = process.env.GHL_CURSO_FIELD_ID        ?? null;
  const origenFieldId = process.env.GHL_ORIGEN_LEAD_FIELD_ID ?? null;

  try {
    const contact = await createGhlContact({
      name:  name.trim(),
      email: email?.trim() || undefined,
      phone: validPhone,
    });

    const opp = await createGhlOpportunity({
      pipelineId,
      pipelineStageId: firstStageId,
      contactId:       contact.id,
      name:            name.trim(),
      customFields: (() => {
        const fields: Array<{ id: string; field_value: string }> = [];
        if (cursoFieldId && courseName?.trim()) fields.push({ id: cursoFieldId,  field_value: courseName.trim() });
        if (origenFieldId)                      fields.push({ id: origenFieldId, field_value: "MANUAL" });
        return fields.length ? fields : undefined;
      })(),
    });

    return { success: true, contactId: contact.id, oppId: opp.id };
  } catch (err: any) {
    return { error: err.message ?? "Error al crear el lead" };
  }
}

export async function updateLeadContactInfo(
  contactId: string,
  oppId:     string,
  data: { name?: string; email?: string; phone?: string },
  original: { name: string; email: string | null; phone: string | null },
): Promise<{ success: true } | { error: string }> {
  await requireCapability("viewPipeline");

  const updates: string[] = [];
  if (data.name  && data.name  !== original.name)  updates.push(`Nombre: "${original.name}" → "${data.name}"`);
  if (data.email !== undefined && data.email !== (original.email ?? ""))  updates.push(`Email: "${original.email ?? "—"}" → "${data.email}"`);
  if (data.phone !== undefined && data.phone !== (original.phone ?? ""))  updates.push(`Teléfono: "${original.phone ?? "—"}" → "${data.phone}"`);

  if (!updates.length) return { success: true };

  // Normalize phone before sending to GHL
  const rawPhone = data.phone?.trim() ?? null;
  const normPhone = rawPhone ? normalizePhone(rawPhone) : null;
  const validPhone = normPhone?.startsWith("+") ? normPhone : (rawPhone ?? undefined);

  try {
    await updateGhlContact(contactId, {
      name:  data.name?.trim(),
      email: data.email?.trim(),
      phone: validPhone,
    });

    // Log the change as an activity note
    const db = createAdminClient() as any;
    const user = await requireAuth();
    await db.from("lead_notes").insert({
      ghl_contact_id:     contactId,
      ghl_opportunity_id: oppId,
      type:               "nota",
      content:            `✏️ Datos de contacto actualizados:\n${updates.join("\n")}`,
      created_by:         user.id,
      created_by_name:    user.fullName ?? user.email ?? "Sistema",
    }).then(() => {}, () => {});

    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "Error al actualizar el contacto" };
  }
}
