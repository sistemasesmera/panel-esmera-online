import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireCapability } from "@/lib/auth/require-role";
import { listLogs } from "@/lib/data/logs.repository";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Logs" };

const ENTITY_COLORS: Record<string, string> = {
  student:    "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60",
  enrollment: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60",
  contract:   "bg-violet-50 text-violet-600 ring-1 ring-violet-200/60",
  course:     "bg-teal-50 text-teal-600 ring-1 ring-teal-200/60",
  user:       "bg-amber-50 text-amber-600 ring-1 ring-amber-200/60",
};

export default async function LogsPage() {
  await requireCapability("viewLogs");
  const logs = await listLogs(200);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Logs de actividad</h1>
        <p className="text-sm text-muted-foreground mt-1">Últimas {logs.length} acciones registradas</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center card-shadow">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <ScrollText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">No hay actividad registrada aún</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Usuario</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Acción</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Entidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-400 font-medium whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-slate-700">{log.users?.full_name ?? log.users?.email ?? "Sistema"}</td>
                  <td className="px-5 py-3 text-xs text-slate-700">{log.action}</td>
                  <td className="px-5 py-3">
                    {log.entity_type && (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ENTITY_COLORS[log.entity_type] ?? "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60"}`}>
                        {log.entity_type}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
