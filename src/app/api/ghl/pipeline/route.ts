import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { fetchGhlPipelines } from "@/lib/ghl/api";
import {
  syncFirstPageToCache,
  syncPipelineToCache,
  getEnrichedOppsFromCache,
} from "@/lib/data/ghl-pipeline.repository";
import { getCacheState } from "@/lib/data/ghl-cache.repository";
import type { AppRole } from "@/lib/domain/shared/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  if (!pipelineId) return NextResponse.json({ error: "pipelineId requerido" }, { status: 400 });

  try {
    const state = await getCacheState(pipelineId);

    if (state.isEmpty) {
      if (state.isLocked) {
        // Sync ya en curso — esperar en el cliente
        return NextResponse.json({ opps: [], syncing: true });
      }
      // Primera carga: sync rápido (~2s, primera página)
      await syncFirstPageToCache(pipelineId);
      // Sync completo en background — fire and forget sin after()
      void syncPipelineToCache(pipelineId).catch(e =>
        console.error("[pipeline] full bg sync failed:", e)
      );
    } else if (state.isStale && !state.isLocked) {
      // Caché obsoleta — refrescar en background sin bloquear
      void syncPipelineToCache(pipelineId).catch(e =>
        console.error("[pipeline] bg refresh failed:", e)
      );
    }

    const allPipelines = await fetchGhlPipelines();
    const pipeline     = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return NextResponse.json({ error: "Pipeline no encontrado" }, { status: 404 });

    const opps = await getEnrichedOppsFromCache(pipelineId, pipeline, {
      id:   user.id,
      role: user.role as AppRole,
    });

    return NextResponse.json({ opps, syncing: false });
  } catch (e) {
    console.error("[api/ghl/pipeline] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
