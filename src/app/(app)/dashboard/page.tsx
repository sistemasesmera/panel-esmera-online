import type { Metadata } from "next";
import { GraduationCap, BookMarked, Clock, FileCheck, Banknote, BookOpen, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/require-role";
import { getDashboardStats, getExpiringEnrollments, getCloserSalesThisMonth, type ExpiringEnrollment, type CloserSales } from "@/lib/data/dashboard.repository";
import { ROLE_LABELS } from "@/lib/domain/shared/permissions";
import { fmt, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

type KpiCardProps = {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  bgAccent: string;
  sub?: string;
};

function KpiCard({ title, value, icon: Icon, accent, bgAccent, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-5 card-shadow flex flex-col gap-3">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center"
        style={{ background: bgAccent, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-1">{title}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const showExpiring     = user.role === "administracion" || user.role === "tutor";
  const showCloserSales  = user.role === "administracion" || user.role === "closer";
  const [stats, expiring, closerSales] = await Promise.all([
    getDashboardStats(),
    showExpiring     ? getExpiringEnrollments(user.role === "tutor" ? user.id : undefined) : Promise.resolve([]),
    showCloserSales  ? getCloserSalesThisMonth(user.role === "closer" ? user.id : undefined) : Promise.resolve([]),
  ]);
  const firstName = user.fullName.split(" ")[0];
  const monthName = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            {ROLE_LABELS[user.role]}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Hola, {firstName}
          </h1>
        </div>
        <p className="text-sm text-slate-400 font-medium pb-1">
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </p>
      </div>

      {/* KPI grid */}
      <section>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
          Resumen general
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            title="Alumnos registrados"
            value={stats.totalStudents}
            icon={GraduationCap}
            accent="#4f46e5"
            bgAccent="#eef2ff"
            />
          <KpiCard
            title="Matrículas activas"
            value={stats.activeEnrollments}
            icon={BookMarked}
            accent="#059669"
            bgAccent="#ecfdf5"
          />
          <KpiCard
            title="Matrículas pendientes"
            value={stats.pendingEnrollments}
            icon={Clock}
            accent="#d97706"
            bgAccent="#fffbeb"
          />
          <KpiCard
            title="Contratos firmados"
            value={stats.signedContractsThisMonth}
            icon={FileCheck}
            accent="#7c3aed"
            bgAccent="#f5f3ff"
            sub="Este mes"
          />
          <KpiCard
            title="Ingresos del mes"
            value={fmt(stats.revenueThisMonth)}
            icon={Banknote}
            accent="#059669"
            bgAccent="#ecfdf5"
            sub="Contratos firmados"
          />
          <KpiCard
            title="Cursos activos"
            value={stats.totalCourses}
            icon={BookOpen}
            accent="#0d9488"
            bgAccent="#f0fdfa"
          />
        </div>
      </section>

      {/* Closer sales ranking */}
      {showCloserSales && (
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
            Ventas por closer — {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </p>

          {user.role === "closer" ? (
            /* Closer: own KPI card */
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <KpiCard
                title="Ventas cerradas"
                value={closerSales[0]?.count ?? 0}
                icon={TrendingUp}
                accent="#7c3aed"
                bgAccent="#f5f3ff"
                sub="Este mes"
              />
              <KpiCard
                title="Importe cerrado"
                value={fmt(closerSales[0]?.total ?? 0)}
                icon={Banknote}
                accent="#059669"
                bgAccent="#ecfdf5"
                sub="Este mes"
              />
            </div>
          ) : (
            /* Administración: full ranking */
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
              {closerSales.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">
                  Sin ventas registradas este mes.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">#</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Closer</th>
                      <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ventas</th>
                      <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Importe total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(closerSales as CloserSales[]).map((row, i) => (
                      <tr key={row.closer_id ?? row.closer_name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
                            i === 0 && "bg-violet-100 text-violet-700",
                            i === 1 && "bg-slate-100 text-slate-600",
                            i === 2 && "bg-amber-100 text-amber-700",
                            i  > 2 && "bg-slate-50 text-slate-400",
                          )}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{row.closer_name}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-full bg-violet-50 text-violet-700 text-xs font-bold">
                            {row.count}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}

      {/* Expiring enrollments */}
      {showExpiring && expiring.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Matrículas próximas a vencer
          </p>
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Nº</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alumna</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Curso</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Vence</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiring.map((e: ExpiringEnrollment) => {
                  const expired  = e.days_remaining < 0;
                  const critical = !expired && e.days_remaining < 7;
                  const warning  = !expired && !critical;
                  return (
                    <tr key={e.id} className={cn(
                      "transition-colors",
                      expired  && "bg-slate-100 hover:bg-slate-200/60",
                      critical && "bg-red-50 hover:bg-red-100/60",
                      warning  && "bg-amber-50 hover:bg-amber-100/60",
                    )}>
                      <td className="px-5 py-3">
                        <Link href={`/enrollments/${e.id}`} className="font-mono text-xs font-bold text-slate-400 hover:text-indigo-600">
                          #{e.enrollment_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800 text-xs">
                        {e.students?.full_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {e.courses?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(e.end_date)}
                      </td>
                      <td className="px-5 py-3">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-600">
                            Vencida
                          </span>
                        ) : critical ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                            {e.days_remaining === 0 ? "Vence hoy" : `${e.days_remaining}d`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            {e.days_remaining}d
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
