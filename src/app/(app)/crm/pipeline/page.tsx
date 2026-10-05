import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { fetchPipelineStructure } from "@/lib/data/ghl-pipeline.repository";
import { PipelineKanban } from "@/components/features/crm/pipeline-kanban";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const currentUser = await requireCapability("viewPipeline");

  let structure;
  try {
    structure = await fetchPipelineStructure();
  } catch (e) {
    return (
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-6">Pipeline de ventas</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">No se pudo conectar con GoHighLevel</p>
          <p className="text-sm text-amber-700">{String(e)}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Pipeline de ventas</h1>
      <PipelineKanban
        pipelines={structure.pipelines}
        formQuestionDefs={structure.formQuestionDefs}
        currentUser={{ id: currentUser.id, role: currentUser.role }}
      />
    </div>
  );
}
