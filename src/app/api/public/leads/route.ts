import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGhlContact } from "@/lib/ghl/api";

const ALLOWED_ORIGINS = [
  "https://www.esmeraonline.com",
  "https://esmeraonline.com",
  "http://localhost:4321",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const o = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin":  o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const os = z.string().max(500).default("");

const schema = z.object({
  nombre:            z.string().min(1, "El nombre es obligatorio").max(200),
  telefono:          os,
  email:             z.union([z.string().email(), z.literal("")]).default(""),
  mensaje:           os,
  acepta_privacidad: z.boolean().default(true),
  form_location:     z.enum(["landing", "ficha_curso", "popup_asesor"]).default("ficha_curso"),
  course_id:         os,
  event_id:          os,
  utm_source:        os,
  utm_medium:        os,
  utm_campaign:      os,
  utm_term:          os,
  utm_content:       os,
  gclid:             os,
  gbraid:            os,
  wbraid:            os,
  fbclid:            os,
  fbc:               os,
  fbp:               os,
  landing_page:      os,
  referrer:          os,
  page_url:          os,
  website:           os,
});

function normalizePhone(raw: string): string | undefined {
  const cleaned = raw.replace(/\s/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return `+34${cleaned}`;
  return undefined;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors   = corsHeaders(origin);

  // Auth
  const token = req.headers.get("x-api-key");
  if (!token || token !== process.env.LEADS_API_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: cors });
  }

  // Parse
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: cors }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400, headers: cors },
    );
  }

  const d = parsed.data;

  // Honeypot — bot detectado, responder ok silenciosamente
  if (d.website) {
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  // Custom fields
  const cursoFieldId  = process.env.GHL_CURSO_FIELD_ID       ?? null;
  const origenFieldId = process.env.GHL_ORIGEN_LEAD_FIELD_ID ?? null;

  const customFields: Array<{ id: string; field_value: string }> = [];
  if (cursoFieldId  && d.course_id) customFields.push({ id: cursoFieldId,  field_value: d.course_id });
  if (origenFieldId)                customFields.push({ id: origenFieldId, field_value: "WEB" });

  try {
    await createGhlContact({
      name:   d.nombre.trim(),
      email:  d.email  || undefined,
      phone:  d.telefono ? normalizePhone(d.telefono) : undefined,
      source: "WEB",
      tags:   d.utm_source ? [`utm_source:${d.utm_source}`] : undefined,
    });

    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502, headers: cors });
  }
}
