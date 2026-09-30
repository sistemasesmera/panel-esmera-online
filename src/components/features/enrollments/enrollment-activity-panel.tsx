import { Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  users: { full_name: string | null } | null;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "enrollment.created":           { label: "Matrícula creada",          color: "bg-emerald-100 text-emerald-700" },
  "enrollment.updated":           { label: "Datos actualizados",         color: "bg-blue-100 text-blue-700" },
  "enrollment.attachment_added":  { label: "Adjunto subido",             color: "bg-indigo-100 text-indigo-700" },
  "enrollment.attachment_deleted":{ label: "Adjunto eliminado",          color: "bg-slate-100 text-slate-600" },
  "contract.sent":                { label: "Contrato enviado",           color: "bg-amber-100 text-amber-700" },
  "contract.signed":              { label: "Contrato firmado",           color: "bg-emerald-100 text-emerald-700" },
  "contract.cancelled":           { label: "Contrato cancelado",         color: "bg-red-100 text-red-700" },
  "enrollment.followup_added":    { label: "Tutoría registrada",         color: "bg-purple-100 text-purple-700" },
};

export function EnrollmentActivityPanel({ activities }: { activities: ActivityRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 card-shadow">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Activity className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900">Actividad</h2>
        {activities.length > 0 && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {activities.length}
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Activity className="h-7 w-7 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Sin actividad registrada aún.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {activities.map(a => {
            const cfg = ACTION_LABELS[a.action] ?? { label: a.action, color: "bg-slate-100 text-slate-600" };
            const detail = a.details as any;
            return (
              <li key={a.id} className="flex items-start gap-4 px-5 py-3">
                <span className={`shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                  {cfg.label}
                </span>
                <div className="flex-1 min-w-0 text-xs text-slate-500">
                  {a.users?.full_name && <span className="font-medium text-slate-700">{a.users.full_name}</span>}
                  {detail?.file_name && <span className="ml-1 text-slate-400">· {detail.file_name}</span>}
                </div>
                <p className="shrink-0 text-[11px] text-slate-400">{formatDate(a.created_at)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
