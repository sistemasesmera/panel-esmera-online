import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { fetchGhlPipelines } from "@/lib/ghl/api";
import { fetchMorePipelineLeads } from "@/lib/data/ghl-pipeline.repository";
import type { AppRole } from "@/lib/domain/shared/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  const pageParam  = req.nextUrl.searchParams.get("page");

  if (!pipelineId) return NextResponse.json({ error: "pipelineId requerido" }, { status: 400 });
  if (!pageParam)  return NextResponse.json({ error: "page requerido" },       { status: 400 });

  const page = parseInt(pageParam, 10);
  if (isNaN(page) || page < 2) return NextResponse.json({ error: "page inválido" }, { status: 400 });

  try {
    const allPipelines = await fetchGhlPipelines();
    const pipeline     = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return NextResponse.json({ error: "Pipeline no encontrado" }, { status: 404 });

    const { opps, nextPage } = await fetchMorePipelineLeads(
      pipelineId,
      pipeline,
      { id: user.id, role: user.role as AppRole },
      page,
    );

    return NextResponse.json({ opps, nextPage });
  } catch (e) {
    console.error("[api/ghl/pipeline/more] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
