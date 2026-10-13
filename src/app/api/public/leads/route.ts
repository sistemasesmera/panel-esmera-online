import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGhlContact, createGhlOpportunity, fetchGhlPipelines } from "@/lib/ghl/api";
import { SETTER_STAGES } from "@/lib/domain/shared/permissions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const schema = z.object({
  name:   z.string().min(1, "El nombre es obligatorio").max(200),
  email:  z.string().email().optional().or(z.literal("")),
  phone:  z.string().max(30).optional(),
  curso:  z.string().max(200).optional(),
  fuente: z.string().max(100).optional(),
});

function normalizePhone(raw: string): string | undefined {
  const cleaned = raw.replace(/\s/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return `+34${cleaned}`;
  return undefined;
}

export async function POST(req: NextRequest) {
  // Auth
  const token = req.headers.get("x-api-key");
  if (!token || token !== process.env.LEADS_API_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CORS_HEADERS });
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { name, email, phone, curso, fuente } = parsed.data;

  // Find first "Lead nuevo" stage across pipelines
  let pipelineId:      string;
  let pipelineStageId: string;
  try {
    const pipelines = await fetchGhlPipelines();
    if (!pipelines.length) throw new Error("No hay pipelines en GHL");

    const pipeline = pipelines[0];
    const firstSetterStage = pipeline.stages.find(s =>
      SETTER_STAGES.some(ss => s.name.toLowerCase().includes(ss.toLowerCase())),
    ) ?? pipeline.stages[0];

    pipelineId      = pipeline.id;
    pipelineStageId = firstSetterStage.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al conectar con GHL: ${msg}` }, { status: 502, headers: CORS_HEADERS });
  }

  // Build custom fields
  const cursoFieldId  = process.env.GHL_CURSO_FIELD_ID        ?? null;
  const origenFieldId = process.env.GHL_ORIGEN_LEAD_FIELD_ID  ?? null;

  const customFields: Array<{ id: string; field_value: string }> = [];
  if (cursoFieldId && curso?.trim())  customFields.push({ id: cursoFieldId,  field_value: curso.trim() });
  if (origenFieldId)                  customFields.push({ id: origenFieldId, field_value: fuente?.trim() || "WEB" });

  // Create contact + opportunity in GHL
  try {
    const contact = await createGhlContact({
      name:  name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() ? normalizePhone(phone.trim()) : undefined,
    });

    let oppId: string;
    try {
      const opp = await createGhlOpportunity({
        pipelineId,
        pipelineStageId,
        contactId:    contact.id,
        name:         name.trim(),
        customFields: customFields.length ? customFields : undefined,
      });
      oppId = opp.id;
    } catch (oppErr: unknown) {
      const oppMsg = oppErr instanceof Error ? oppErr.message : String(oppErr);
      // Contacto ya tiene oportunidad — extraer el id existente y continuar
      const existingMatch = oppMsg.match(/"existingId"\s*:\s*"([^"]+)"/);
      if (existingMatch) {
        oppId = existingMatch[1];
      } else {
        throw oppErr;
      }
    }

    return NextResponse.json({ success: true, contactId: contact.id, oppId }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502, headers: CORS_HEADERS });
  }
}
