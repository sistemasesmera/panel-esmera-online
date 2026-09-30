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

export type { GhlPipeline, GhlPipelineStage, GhlOpportunity };

export type OppEnriched = GhlOpportunity & {
  cursoValue:       string | null;
  origenLead:       string | null;
  zone:             "setter" | "closer" | "other";
  temperatura:      string | null;
  importe_previsto: number | null;
};

export type PipelineData = {
  pipelines: GhlPipeline[];
  oppsByPipeline: Record<string, OppEnriched[]>;
  totalValue: number;
  totalOpen: number;
};

function getZone(stageName: string): "setter" | "closer" | "other" {
  if (SETTER_STAGES.some((s) => stageName.toLowerCase().includes(s.toLowerCase()))) return "setter";
  if (CLOSER_STAGES.some((s) => stageName.toLowerCase().includes(s.toLowerCase()))) return "closer";
  return "other";
}

async function enrichOpps(opps: GhlOpportunity[], pipeline: GhlPipeline): Promise<OppEnriched[]> {
  const stageNameById = Object.fromEntries(pipeline.stages.map((s) => [s.id, s.name]));

  // IDs de campos custom en el objeto opportunity (distinto nivel que contact)
  const cursoFieldId  = process.env.GHL_CURSO_FIELD_ID       ?? null;
  const origenFieldId = process.env.GHL_ORIGEN_LEAD_FIELD_ID ?? null;

  const uniqueContactIds = [...new Set(opps.map((o) => o.contact.id))];

  // Fetch lead profiles from Supabase for temperatura + importe
  const db = createAdminClient() as any;
  const { data: profiles } = await db
    .from("lead_profiles")
    .select("ghl_contact_id, temperatura, importe_previsto")
    .in("ghl_contact_id", uniqueContactIds);

  const profileByContact = new Map<string, { temperatura: string | null; importe_previsto: number | null }>();
  for (const p of profiles ?? []) {
    profileByContact.set(p.ghl_contact_id, {
      temperatura:      p.temperatura      ?? null,
      importe_previsto: p.importe_previsto ?? null,
    });
  }

  return opps.map((o) => {
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
    };
  });
}

export async function fetchPipelineData(): Promise<PipelineData> {
  const allPipelines = await fetchGhlPipelines();

  // Si hay un pipeline ID configurado, solo cargamos ese
  const defaultPipelineId = process.env.GHL_PIPELINE_ID;
  const pipelines = defaultPipelineId
    ? allPipelines.filter((p) => p.id === defaultPipelineId)
    : allPipelines;

  const entries = await Promise.all(
    pipelines.map(async (p) => {
      const opps = await fetchGhlOpportunities(p.id);
      const enriched = await enrichOpps(opps, p);
      return [p.id, enriched] as const;
    })
  );

  const oppsByPipeline = Object.fromEntries(entries);
  const allOpps = Object.values(oppsByPipeline).flat();
  const totalValue = allOpps.reduce((s, o) => s + (o.monetaryValue ?? 0), 0);
  const totalOpen = allOpps.filter((o) => o.status === "open").length;

  return { pipelines, oppsByPipeline, totalValue, totalOpen };
}
