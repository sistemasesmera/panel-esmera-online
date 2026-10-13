import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGhlContact, fetchGhlCustomFieldDefs } from "@/lib/ghl/api";

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

  // Fetch GHL custom field definitions to build key→id map
  let fieldMap: Record<string, string> = {};
  try {
    const defs = await fetchGhlCustomFieldDefs();
    for (const f of defs) {
      const key = (f.fieldKey.split(".").pop() ?? f.fieldKey).toLowerCase();
      fieldMap[key] = f.id;
    }
  } catch { /* proceed without custom fields if GHL is unreachable */ }

  function cf(key: string, value: string | undefined): { id: string; field_value: string } | null {
    const v = value?.trim();
    if (!v || !fieldMap[key]) return null;
    return { id: fieldMap[key], field_value: v };
  }

  const customFields = [
    cf("lead_source",   "WEB"),
    cf("utm_source",    d.utm_source),
    cf("utm_medium",    d.utm_medium),
    cf("utm_campaign",  d.utm_campaign),
    cf("utm_term",      d.utm_term),
    cf("utm_content",   d.utm_content),
    cf("landing_page",  d.landing_page),
    cf("referrer",      d.referrer),
    cf("form_location", d.form_location),
    cf("gbraid",        d.gbraid),
    cf("wbraid",        d.wbraid),
    cf("web_gclid",     d.gclid),
    cf("fbclid",        d.fbclid),
    cf("fbc",           d.fbc),
    cf("fbp",           d.fbp),
    cf("course_id",     d.course_id !== "sin_definir" ? d.course_id : undefined),
    cf("event_id",      d.event_id),
  ].filter((f): f is { id: string; field_value: string } => f !== null);

  try {
    await createGhlContact({
      name:         d.nombre.trim(),
      email:        d.email || undefined,
      phone:        d.telefono ? normalizePhone(d.telefono) : undefined,
      source:       "WEB",
      customFields: customFields.length ? customFields : undefined,
    });

    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502, headers: cors });
  }
}
