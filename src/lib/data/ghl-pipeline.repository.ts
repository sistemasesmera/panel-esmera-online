import "server-only";
import {
  fetchGhlPipelines,
  fetchGhlOpportunities,
  type GhlPipeline,
  type GhlPipelineStage,
  type GhlOpportunity,
} from "@/lib/ghl/api";
import { SETTER_STAGES, CLOSER_STAGES } from "@/lib/domain/shared/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/domain/shared/permissions";

export type { GhlPipeline, GhlPipelineStage, GhlOpportunity };

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

export type PipelineData = {
  pipelines:      GhlPipeline[];
  oppsByPipeline: Record<string, OppEnriched[]>;
  totalValue:     number;
  totalOpen:      number;
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
    ghl_contact_id: string;
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

  // ── Filter by assignment based on role ────────────────────────────────────
  if (currentUser.role === "administracion") return enriched;

  // Any non-admin sees leads where they are setter OR closer (roles can overlap)
  return enriched.filter(o =>
    o.setter_id === currentUser.id ||
    o.closer_id === currentUser.id ||
    // Unassigned leads visible to setters so they can be picked up
    (currentUser.role === "setter" && !o.setter_id && !o.closer_id)
  );
}

export async function fetchPipelineData(currentUser: PipelineUser): Promise<PipelineData> {
  const allPipelines = await fetchGhlPipelines();

  const defaultPipelineId = process.env.GHL_PIPELINE_ID;
  const pipelines = defaultPipelineId
    ? allPipelines.filter((p) => p.id === defaultPipelineId)
    : allPipelines;

  const entries = await Promise.all(
    pipelines.map(async (p) => {
      const opps     = await fetchGhlOpportunities(p.id);
      const enriched = await enrichOpps(opps, p, currentUser);
      return [p.id, enriched] as const;
    })
  );

  const oppsByPipeline = Object.fromEntries(entries);
  const allOpps        = Object.values(oppsByPipeline).flat();
  const totalValue     = allOpps.reduce((s, o) => s + (o.monetaryValue ?? 0), 0);
  const totalOpen      = allOpps.filter((o) => o.status === "open").length;

  return { pipelines, oppsByPipeline, totalValue, totalOpen };
}
