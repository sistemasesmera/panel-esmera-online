import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { fetchGhlPipelines } from "@/lib/ghl/api";
import { fetchEnrichedPipelineOpps, syncPipelineToCache } from "@/lib/data/ghl-pipeline.repository";
import { getCacheState } from "@/lib/data/ghl-cache.repository";
import type { AppRole } from "@/lib/domain/shared/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  if (!pipelineId) return NextResponse.json({ error: "pipelineId requerido" }, { status: 400 });

  try {
    const state = await getCacheState(pipelineId);

    // Primera visita — caché vacía: responder vacío al instante y sincronizar en background
    if (state.isEmpty) {
      if (!state.isLocked) {
        after(async () => {
          try { await syncPipelineToCache(pipelineId); }
          catch (e) { console.error("[pipeline] initial sync failed:", e); }
        });
      }
      return NextResponse.json({ opps: [], syncing: true });
    }

    const allPipelines = await fetchGhlPipelines();
    const pipeline     = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return NextResponse.json({ error: "Pipeline no encontrado" }, { status: 404 });

    const opps = await fetchEnrichedPipelineOpps(pipelineId, pipeline, {
      id:   user.id,
      role: user.role as AppRole,
    });

    return NextResponse.json({ opps, syncing: false });
  } catch (e) {
    console.error("[api/ghl/pipeline] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
