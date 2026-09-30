import { Activity } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  users: { full_name: string | null } | null;
};

type ActionCfg = { label: string; badge: string; dot: string };

const ACTION_CFG: Record<string, ActionCfg> = {
  "enrollment.created":            { label: "Matrícula creada",    badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  "enrollment.updated":            { label: "Datos actualizados",  badge: "bg-blue-100 text-blue-700",      dot: "bg-blue-400"    },
  "enrollment.status_changed":     { label: "Estado cambiado",     badge: "bg-violet-100 text-violet-700",  dot: "bg-violet-400"  },
  "enrollment.attachment_added":   { label: "Adjunto subido",      badge: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-400"  },
  "enrollment.attachment_deleted": { label: "Adjunto eliminado",   badge: "bg-slate-100 text-slate-600",    dot: "bg-slate-300"   },
  "contract.sent":                 { label: "Contrato enviado",    badge: "bg-amber-100 text-amber-700",    dot: "bg-amber-400"   },
  "contract.signed":               { label: "Contrato firmado",    badge: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-400" },
  "contract.cancelled":            { label: "Contrato cancelado",  badge: "bg-red-100 text-red-700",        dot: "bg-red-400"     },
  "enrollment.followup_added":     { label: "Tutoría registrada",  badge: "bg-purple-100 text-purple-700",  dot: "bg-purple-400"  },
};

const FALLBACK: ActionCfg = { label: "", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-300" };

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
            const cfg    = ACTION_CFG[a.action] ?? { ...FALLBACK, label: a.action };
            const detail = a.details as any;
            const changes: Record<string, string> | null = detail?.changes ?? null;

            return (
              <li key={a.id} className="flex gap-3 px-5 py-3.5">
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1.5 shrink-0">
                  <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top row: badge + user + timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {a.users?.full_name && (
                        <span className="text-xs font-semibold text-slate-700">{a.users.full_name}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                      {formatDateTime(a.created_at)}
                    </span>
                  </div>

                  {/* Changes detail */}
                  {changes && Object.keys(changes).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                      {Object.entries(changes).map(([field, value]) => (
                        <span key={field} className="text-xs">
                          <span className="text-slate-400">{field}:</span>{" "}
                          <span className="font-medium text-slate-700">{value}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Attachment name */}
                  {detail?.file_name && (
                    <p className="mt-1 text-xs text-slate-500">{detail.file_name}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
