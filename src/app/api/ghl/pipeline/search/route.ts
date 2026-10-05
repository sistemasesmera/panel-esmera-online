import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { fetchGhlPipelines } from "@/lib/ghl/api";
import { searchPipelineLeads } from "@/lib/data/ghl-pipeline.repository";
import type { AppRole } from "@/lib/domain/shared/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  const q          = req.nextUrl.searchParams.get("q")?.trim();

  if (!pipelineId) return NextResponse.json({ error: "pipelineId requerido" }, { status: 400 });
  if (!q)          return NextResponse.json({ opps: [] });

  try {
    const allPipelines = await fetchGhlPipelines();
    const pipeline     = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return NextResponse.json({ error: "Pipeline no encontrado" }, { status: 404 });

    const opps = await searchPipelineLeads(
      pipelineId,
      pipeline,
      { id: user.id, role: user.role as AppRole },
      q,
    );

    return NextResponse.json({ opps });
  } catch (e) {
    console.error("[api/ghl/pipeline/search] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
