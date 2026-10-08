/**
 * Mueve a "Cualificando" todos los leads de la etapa "Lead nuevo"
 * que se crearon hoy a partir de las 16:10 (hora Madrid).
 *
 * Uso:
 *   node scripts/move-imported-leads-to-cualificando.mjs
 *
 * Requiere las variables de entorno del .env.local del proyecto.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Cargar .env.local ─────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env.local");
try {
  const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error("No se encontró .env.local — asegúrate de ejecutar desde la raíz del proyecto");
  process.exit(1);
}

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_KEY  = process.env.GHL_API_KEY;
const LOCATION_ID  = process.env.GHL_LOCATION_ID;

if (!GHL_API_KEY || !LOCATION_ID) {
  console.error("Faltan GHL_API_KEY o GHL_LOCATION_ID en .env.local");
  process.exit(1);
}

function headers() {
  return {
    Authorization: `Bearer ${GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-04-15",
  };
}

// ── Hora de corte: hoy 16:10 hora Madrid ─────────────────────────────────────
const cutoff = new Date("2026-10-07T16:09:00+02:00"); // CEST = UTC+2
console.log(`Fecha de corte: ${cutoff.toISOString()}`);

// ── 1. Obtener pipelines ──────────────────────────────────────────────────────
async function fetchPipelines() {
  const url = new URL(`${GHL_API_BASE}/opportunities/pipelines`);
  url.searchParams.set("locationId", LOCATION_ID);
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Error pipelines: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.pipelines ?? [];
}

// ── 2. Obtener oportunidades de un pipeline paginando ─────────────────────────
async function fetchAllOppsInStage(pipelineId, stageId) {
  const all = [];
  let page = 1;
  while (true) {
    const url = new URL(`${GHL_API_BASE}/opportunities/search`);
    url.searchParams.set("location_id", LOCATION_ID);
    url.searchParams.set("pipeline_id", pipelineId);
    url.searchParams.set("pipeline_stage_id", stageId);
    url.searchParams.set("limit", "100");
    url.searchParams.set("page", String(page));
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`Error opps: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const opps = data.opportunities ?? [];
    all.push(...opps);
    if (opps.length < 100) break;
    page++;
  }
  return all;
}

// ── 3. Mover oportunidad de etapa ─────────────────────────────────────────────
async function moveOpp(oppId, stageId) {
  const res = await fetch(`${GHL_API_BASE}/opportunities/${oppId}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ pipelineStageId: stageId }),
  });
  if (!res.ok) throw new Error(`Error al mover ${oppId}: ${res.status} ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const pipelines = await fetchPipelines();
if (!pipelines.length) { console.error("No se encontraron pipelines"); process.exit(1); }

// Usar el primer pipeline (o el que tenga "esmera" en el nombre)
const pipeline = pipelines.find(p => norm(p.name).includes("esmera")) ?? pipelines[0];
console.log(`Pipeline: ${pipeline.name} (${pipeline.id})`);

const nuevosStage      = pipeline.stages.find(s => norm(s.name).includes("lead nuevo") || norm(s.name) === "nuevo");
const cualificandoStage = pipeline.stages.find(s => norm(s.name).includes("cualificando"));

if (!nuevosStage)       { console.error("No se encontró la etapa 'Lead nuevo'");   process.exit(1); }
if (!cualificandoStage) { console.error("No se encontró la etapa 'Cualificando'"); process.exit(1); }

console.log(`Etapa origen:  ${nuevosStage.name} (${nuevosStage.id})`);
console.log(`Etapa destino: ${cualificandoStage.name} (${cualificandoStage.id})`);
console.log("");

const opps = await fetchAllOppsInStage(pipeline.id, nuevosStage.id);
console.log(`Leads en "${nuevosStage.name}": ${opps.length}`);

const toMove = opps.filter(o => new Date(o.createdAt) >= cutoff);
console.log(`Leads creados desde las 16:10: ${toMove.length}`);

if (!toMove.length) {
  console.log("Nada que mover.");
  process.exit(0);
}

console.log("\nMoviendo...");
let ok = 0, fail = 0;
for (const opp of toMove) {
  try {
    await moveOpp(opp.id, cualificandoStage.id);
    console.log(`  ✓ ${opp.name}`);
    ok++;
    // Pequeña pausa para no saturar la API de GHL
    await new Promise(r => setTimeout(r, 150));
  } catch (err) {
    console.error(`  ✗ ${opp.name}: ${err.message}`);
    fail++;
  }
}

console.log(`\nListo: ${ok} movidos, ${fail} errores`);
