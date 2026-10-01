import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { fetchPipelineData } from "@/lib/data/ghl-pipeline.repository";
import { PipelineKanban } from "@/components/features/crm/pipeline-kanban";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const currentUser = await requireCapability("viewPipeline");

  let data;
  try {
    data = await fetchPipelineData({ id: currentUser.id, role: currentUser.role });
  } catch {
    return (
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-6">Pipeline de ventas</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">Credenciales de GoHighLevel no configuradas</p>
          <p className="text-sm text-amber-700">
            Añade <code className="bg-amber-100 px-1 rounded">GHL_API_KEY</code> y{" "}
            <code className="bg-amber-100 px-1 rounded">GHL_LOCATION_ID</code> en el archivo{" "}
            <code className="bg-amber-100 px-1 rounded">.env.local</code> y reinicia el servidor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Pipeline de ventas</h1>
      <PipelineKanban
        pipelines={data.pipelines}
        oppsByPipeline={data.oppsByPipeline}
        formQuestionDefs={data.formQuestionDefs}
        currentUser={{ id: currentUser.id, role: currentUser.role }}
      />
    </div>
  );
}
