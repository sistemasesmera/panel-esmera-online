import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GhlOpportunity } from "@/lib/ghl/api";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const LOCK_TTL_MS  =  2 * 60 * 1000; //  2 minutos máximo por sync

export type CacheState = {
  isEmpty:  boolean;
  isStale:  boolean;
  isLocked: boolean;
};

export async function getCacheState(pipelineId: string): Promise<CacheState> {
  const db = createAdminClient() as any;
  const { data } = await db
    .from("ghl_pipeline_sync")
    .select("last_sync, syncing_since")
    .eq("pipeline_id", pipelineId)
    .maybeSingle();

  const now          = Date.now();
  const lastSync     = data?.last_sync      ? new Date(data.last_sync).getTime()      : 0;
  const syncingSince = data?.syncing_since  ? new Date(data.syncing_since).getTime()  : 0;

  return {
    isEmpty:  !data?.last_sync,
    isStale:  now - lastSync > CACHE_TTL_MS,
    isLocked: syncingSince > 0 && now - syncingSince < LOCK_TTL_MS,
  };
}

export async function getOpportunitiesFromCache(pipelineId: string): Promise<GhlOpportunity[]> {
  const db = createAdminClient() as any;
  const { data } = await db
    .from("ghl_opportunities_cache")
    .select("*")
    .eq("pipeline_id", pipelineId);

  return (data ?? []).map(rowToOpp);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOpp(row: any): GhlOpportunity {
  return {
    id:                  row.id,
    name:                row.name ?? "",
    pipelineId:          row.pipeline_id,
    pipelineStageId:     row.pipeline_stage_id,
    status:              row.status,
    monetaryValue:       row.monetary_value ?? null,
    assignedTo:          row.assigned_to ?? null,
    contact: {
      id:    row.contact_id,
      name:  row.contact_name ?? "",
      email: row.contact_email ?? null,
      phone: row.contact_phone ?? null,
    },
    customFields:        row.custom_fields ?? [],
    createdAt:           row.created_at_ghl  ?? new Date().toISOString(),
    updatedAt:           row.updated_at_ghl  ?? new Date().toISOString(),
    lastStageChangeAt:   row.last_stage_change_at ?? null,
  };
}

export async function upsertOpportunitiesCache(
  pipelineId: string,
  opps:        GhlOpportunity[],
): Promise<void> {
  const db      = createAdminClient() as any;
  const syncedAt = new Date().toISOString();

  const rows = opps.map(o => ({
    id:                   o.id,
    pipeline_id:          o.pipelineId,
    pipeline_stage_id:    o.pipelineStageId,
    contact_id:           o.contact.id,
    contact_name:         o.contact.name,
    contact_email:        o.contact.email,
    contact_phone:        o.contact.phone,
    name:                 o.name,
    status:               o.status,
    monetary_value:       o.monetaryValue,
    custom_fields:        o.customFields ?? [],
    assigned_to:          o.assignedTo,
    created_at_ghl:       o.createdAt,
    updated_at_ghl:       o.updatedAt,
    last_stage_change_at: o.lastStageChangeAt ?? null,
    synced_at:            syncedAt,
  }));

  if (rows.length > 0) {
    await db.from("ghl_opportunities_cache").upsert(rows, { onConflict: "id" });
  }

  // Borra registros que ya no existen en GHL (eliminados o movidos fuera del pipeline)
  await db
    .from("ghl_opportunities_cache")
    .delete()
    .eq("pipeline_id", pipelineId)
    .lt("synced_at", syncedAt);

  await db.from("ghl_pipeline_sync").upsert(
    { pipeline_id: pipelineId, last_sync: syncedAt, syncing_since: null },
    { onConflict: "pipeline_id" },
  );
}

export async function acquireSyncLock(pipelineId: string): Promise<void> {
  const db = createAdminClient() as any;
  await db.from("ghl_pipeline_sync").upsert(
    { pipeline_id: pipelineId, syncing_since: new Date().toISOString() },
    { onConflict: "pipeline_id" },
  );
}

export async function releaseSyncLock(pipelineId: string): Promise<void> {
  const db = createAdminClient() as any;
  await db
    .from("ghl_pipeline_sync")
    .update({ syncing_since: null })
    .eq("pipeline_id", pipelineId);
}

export async function updateCachedOppStage(oppId: string, stageId: string): Promise<void> {
  const db = createAdminClient() as any;
  await db
    .from("ghl_opportunities_cache")
    .update({ pipeline_stage_id: stageId, updated_at_ghl: new Date().toISOString() })
    .eq("id", oppId);
}
