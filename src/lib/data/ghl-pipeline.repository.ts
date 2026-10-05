import "server-only";
import { after } from "next/server";
import {
  fetchGhlPipelines,
  fetchGhlOpportunities,
  fetchGhlOpportunitiesPage,
  fetchGhlCustomFieldDefs,
  type GhlPipeline,
  type GhlPipelineStage,
  type GhlOpportunity,
  type GhlCustomFieldDef,
} from "@/lib/ghl/api";
import { SETTER_STAGES, CLOSER_STAGES } from "@/lib/domain/shared/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/domain/shared/permissions";
import {
  getCacheState,
  getOpportunitiesFromCache,
  upsertOpportunitiesCache,
  acquireSyncLock,
  releaseSyncLock,
} from "@/lib/data/ghl-cache.repository";

export type { GhlPipeline, GhlPipelineStage, GhlOpportunity, GhlCustomFieldDef };

export type OppEnriched = GhlOpportunity & {
  cursoValue:       string | null;
  origenLead:       string | null;
  zone:             "setter" | "closer" | "other";
  temperatura:      string | null;
  importe_previsto: number | null;
  setter_id:        string | null;
  setter_name:      string | null;
  closer_id:        string | null;
  closer_name:      string | null;
};

export type PipelineStructure = {
  pipelines:       GhlPipeline[];
  formQuestionDefs: GhlCustomFieldDef[];
};

export type PipelineUser = { id: string; role: AppRole };

function getZone(stageName: string): "setter" | "closer" | "other" {
  if (SETTER_STAGES.some((s) => stageName.toLowerCase().includes(s.toLowerCase()))) return "setter";
  if (CLOSER_STAGES.some((s) => stageName.toLowerCase().includes(s.toLowerCase()))) return "closer";
  return "other";
}

async function enrichOpps(
  opps:          GhlOpportunity[],
  pipeline:      GhlPipeline,
  currentUser:   PipelineUser,
): Promise<OppEnriched[]> {
  const stageNameById = Object.fromEntries(pipeline.stages.map((s) => [s.id, s.name]));

  const cursoFieldId  = process.env.GHL_CURSO_FIELD_ID        ?? null;
  const origenFieldId = process.env.GHL_ORIGEN_LEAD_FIELD_ID  ?? null;

  const uniqueContactIds = [...new Set(opps.map((o) => o.contact.id))];
  if (!uniqueContactIds.length) return [];

  const db = createAdminClient() as any;
  const { data: profiles } = await db
    .from("lead_profiles")
    .select("ghl_contact_id, temperatura, importe_previsto, setter_id, setter_name, closer_id, closer_name")
    .in("ghl_contact_id", uniqueContactIds);

  type ProfileRow = {
    ghl_contact_id:   string;
    temperatura:      string | null;
    importe_previsto: number | null;
    setter_id:        string | null;
    setter_name:      string | null;
    closer_id:        string | null;
    closer_name:      string | null;
  };

  const profileByContact = new Map<string, ProfileRow>();
  for (const p of profiles ?? []) {
    profileByContact.set(p.ghl_contact_id, p);
  }

  const enriched: OppEnriched[] = opps.map((o) => {
    const stageName = stageNameById[o.pipelineStageId] ?? "";
    const profile   = profileByContact.get(o.contact.id);
    const cFields   = o.customFields ?? [];
    const curso     = cursoFieldId  ? (cFields.find(f => f.id === cursoFieldId)?.fieldValueString  ?? null) : null;
    const origen    = origenFieldId ? (cFields.find(f => f.id === origenFieldId)?.fieldValueString ?? null) : null;
    return {
      ...o,
      pipelineStageName: stageName,
      cursoValue:        curso,
      origenLead:        origen,
      zone:              getZone(stageName),
      temperatura:       profile?.temperatura      ?? null,
      importe_previsto:  profile?.importe_previsto ?? null,
      setter_id:         profile?.setter_id        ?? null,
      setter_name:       profile?.setter_name      ?? null,
      closer_id:         profile?.closer_id        ?? null,
      closer_name:       profile?.closer_name      ?? null,
    };
  });

  if (currentUser.role === "administracion") return enriched;

  return enriched.filter(o =>
    o.setter_id === currentUser.id ||
    o.closer_id === currentUser.id ||
    (currentUser.role === "setter" && !o.setter_id && !o.closer_id)
  );
}

// Sync completo — todas las páginas. Usar en background (es lento).
export async function syncPipelineToCache(pipelineId: string): Promise<void> {
  await acquireSyncLock(pipelineId);
  try {
    const opps = await fetchGhlOpportunities(pipelineId);
    await upsertOpportunitiesCache(pipelineId, opps);
  } catch (e) {
    // No liberar el lock en error — que expire solo (2 min) para evitar bucles rápidos
    console.error("[pipeline] sync failed:", e);
    throw e;
  }
}

// Sync rápido — solo primera página (100 leads). Seguro para respuesta síncrona.
export async function syncFirstPageToCache(pipelineId: string): Promise<void> {
  await acquireSyncLock(pipelineId);
  try {
    const opps = await fetchGhlOpportunities(pipelineId, 100);
    await upsertOpportunitiesCache(pipelineId, opps);
  } finally {
    await releaseSyncLock(pipelineId).catch(() => {});
  }
}

// Solo lectura + enriquecimiento desde caché — no hace ningún sync
export async function getEnrichedOppsFromCache(
  pipelineId:  string,
  pipeline:    GhlPipeline,
  currentUser: PipelineUser,
): Promise<OppEnriched[]> {
  const opps = await getOpportunitiesFromCache(pipelineId);
  return enrichOpps(opps, pipeline, currentUser);
}

// Leads de una etapa concreta — 20 por página para carga por columna
export async function fetchStageLeads(
  pipelineId:  string,
  stageId:     string,
  pipeline:    GhlPipeline,
  currentUser: PipelineUser,
  page:        number,
): Promise<{ opps: OppEnriched[]; total: number | null; nextPage: number | null }> {
  const { opps: raw, total, nextPage } = await fetchGhlOpportunitiesPage(
    pipelineId, page, { stageId, limit: 20 },
  );
  const opps = await enrichOpps(raw, pipeline, currentUser);
  return { opps, total, nextPage };
}

// Primera página (100 leads) — rápido para el servidor. El resto se carga client-side.
export async function fetchPipelineLeads(
  pipelineId:  string,
  pipeline:    GhlPipeline,
  currentUser: PipelineUser,
): Promise<{ opps: OppEnriched[]; nextPage: number | null }> {
  const { opps: raw, nextPage } = await fetchGhlOpportunitiesPage(pipelineId, 1);
  const opps = await enrichOpps(raw, pipeline, currentUser);
  return { opps, nextPage };
}

// Página siguiente — usa el número de página devuelto por la anterior
export async function fetchMorePipelineLeads(
  pipelineId:  string,
  pipeline:    GhlPipeline,
  currentUser: PipelineUser,
  page:        number,
): Promise<{ opps: OppEnriched[]; nextPage: number | null }> {
  const { opps: raw, nextPage } = await fetchGhlOpportunitiesPage(pipelineId, page);
  const opps = await enrichOpps(raw, pipeline, currentUser);
  return { opps, nextPage };
}

// Devuelve solo la estructura (pipelines + fieldDefs) — no toca GHL leads, es rápido
export async function fetchPipelineStructure(): Promise<PipelineStructure> {
  const defaultPipelineId = process.env.GHL_PIPELINE_ID;
  const cursoFieldId      = process.env.GHL_CURSO_FIELD_ID       ?? null;
  const origenFieldId     = process.env.GHL_ORIGEN_LEAD_FIELD_ID ?? null;

  const [allPipelines, allDefs] = await Promise.all([
    fetchGhlPipelines(),
    fetchGhlCustomFieldDefs(),
  ]);

  const systemIds  = new Set([cursoFieldId, origenFieldId].filter(Boolean) as string[]);
  const systemKeys = new Set(["contact.curso", "contact.origen_lead"]);
  const formQuestionDefs = allDefs.filter(d => !systemIds.has(d.id) && !systemKeys.has(d.fieldKey));

  const pipelines = defaultPipelineId
    ? allPipelines.filter((p) => p.id === defaultPipelineId)
    : allPipelines;

  return { pipelines, formQuestionDefs };
}

// Usado por el API route — lee de caché y enriquece con lead_profiles
export async function fetchEnrichedPipelineOpps(
  pipelineId:  string,
  pipeline:    GhlPipeline,
  currentUser: PipelineUser,
): Promise<OppEnriched[]> {
  const state = await getCacheState(pipelineId);

  if (state.isEmpty) {
    await syncPipelineToCache(pipelineId);
  } else if (state.isStale && !state.isLocked) {
    after(async () => {
      try { await syncPipelineToCache(pipelineId); }
      catch (e) { console.error("[pipeline] bg sync failed:", e); }
    });
  }

  const opps = await getOpportunitiesFromCache(pipelineId);
  return enrichOpps(opps, pipeline, currentUser);
}
