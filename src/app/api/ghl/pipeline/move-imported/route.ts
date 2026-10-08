import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { fetchGhlPipelines, fetchGhlOpportunitiesPage, updateGhlOpportunity } from "@/lib/ghl/api";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function fetchAllOppsInStage(pipelineId: string, stageId: string) {
  const all = [];
  let page = 1;
  while (true) {
    const { opps } = await fetchGhlOpportunitiesPage(pipelineId, page, { stageId, limit: 100 });
    all.push(...opps);
    if (opps.length < 100) break;
    page++;
  }
  return all;
}

/**
 * GET  ?pipelineId=...&since=2026-10-07T16:09:00%2B02:00&dryRun=true
 *   → devuelve los leads que serían movidos (para confirmar)
 *
 * POST { pipelineId, since }
 *   → mueve los leads y devuelve resultado
 */

async function resolveStages(pipelineId?: string | null) {
  const pipelines = await fetchGhlPipelines();

  // Si se pasa pipelineId explícito, usarlo; si no, buscar el que tenga etapa "Cualificando"
  const pipeline = pipelineId
    ? pipelines.find(p => p.id === pipelineId)
    : pipelines.find(p => p.stages.some(s => norm(s.name).includes("cualificando")));

  if (!pipeline) throw new Error("No se encontró ningún pipeline con etapa 'Cualificando'");

  const nuevosStage       = pipeline.stages.find(s => norm(s.name).includes("lead nuevo") || norm(s.name) === "nuevo");
  const cualificandoStage = pipeline.stages.find(s => norm(s.name).includes("cualificando"));

  if (!nuevosStage)       throw new Error("No se encontró la etapa 'Lead Nuevo'");
  if (!cualificandoStage) throw new Error("No se encontró la etapa 'Cualificando'");

  return { pipeline, nuevosStage, cualificandoStage };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  const sinceParam = req.nextUrl.searchParams.get("since");

  const since = sinceParam ? new Date(sinceParam) : new Date("2026-10-07T16:09:00+02:00");
  if (isNaN(since.getTime())) {
    return NextResponse.json({ error: "Parámetro 'since' inválido. Usa ISO 8601, ej: 2026-10-07T16:09:00+02:00" }, { status: 400 });
  }

  try {
    const debug = req.nextUrl.searchParams.get("debug") === "true";
    if (debug) {
      const pipelines = await fetchGhlPipelines();
      return NextResponse.json(pipelines.map(p => ({
        id: p.id, name: p.name,
        stages: p.stages.map(s => ({ id: s.id, name: s.name, position: s.position })),
      })));
    }

    const execute = req.nextUrl.searchParams.get("execute") === "true";
    const { pipeline, nuevosStage, cualificandoStage } = await resolveStages(pipelineId);
    const opps = await fetchAllOppsInStage(pipeline.id, nuevosStage.id);
    const toMove = opps.filter(o => new Date(o.createdAt) >= since);

    if (execute) {
      const results: Array<{ id: string; nombre: string; ok: boolean; error?: string }> = [];
      for (const opp of toMove) {
        try {
          await updateGhlOpportunity(opp.id, { pipelineStageId: cualificandoStage.id });
          results.push({ id: opp.id, nombre: opp.name, ok: true });
          await new Promise(r => setTimeout(r, 150));
        } catch (err: any) {
          results.push({ id: opp.id, nombre: opp.name, ok: false, error: err.message });
        }
      }
      return NextResponse.json({
        moved:  results.filter(r => r.ok).length,
        errors: results.filter(r => !r.ok).length,
        results,
      });
    }

    return NextResponse.json({
      pipeline:        { id: pipeline.id, name: pipeline.name },
      stageOrigen:     { id: nuevosStage.id,       name: nuevosStage.name },
      stageDestino:    { id: cualificandoStage.id,  name: cualificandoStage.name },
      since:           since.toISOString(),
      totalEnNuevos:   opps.length,
      totalAMover:     toMove.length,
      leads: toMove.map(o => ({
        id:        o.id,
        nombre:    o.name,
        createdAt: o.createdAt,
        contactId: o.contact.id,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sinceParam = body.since as string | undefined;

  const since = sinceParam ? new Date(sinceParam) : new Date("2026-10-07T16:09:00+02:00");
  if (isNaN(since.getTime())) {
    return NextResponse.json({ error: "Campo 'since' inválido. Usa ISO 8601, ej: 2026-10-07T16:09:00+02:00" }, { status: 400 });
  }

  try {
    const { pipeline, nuevosStage, cualificandoStage } = await resolveStages(body.pipelineId);
    const opps = await fetchAllOppsInStage(pipeline.id, nuevosStage.id);
    const toMove = opps.filter(o => new Date(o.createdAt) >= since);

    const results: Array<{ id: string; nombre: string; ok: boolean; error?: string }> = [];

    for (const opp of toMove) {
      try {
        await updateGhlOpportunity(opp.id, { pipelineStageId: cualificandoStage.id });
        results.push({ id: opp.id, nombre: opp.name, ok: true });
        await new Promise(r => setTimeout(r, 150));
      } catch (err: any) {
        results.push({ id: opp.id, nombre: opp.name, ok: false, error: err.message });
      }
    }

    const moved  = results.filter(r => r.ok).length;
    const errors = results.filter(r => !r.ok).length;

    return NextResponse.json({ moved, errors, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
