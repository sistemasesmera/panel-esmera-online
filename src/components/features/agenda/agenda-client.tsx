"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Calendar, Phone, User, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateCitaStatus } from "@/app/(app)/agenda/actions";

type Cita = {
  id:                 string;
  ghl_contact_id:     string;
  ghl_opportunity_id: string | null;
  contact_name:       string;
  contact_phone:      string | null;
  comercial_id:       string | null;
  comercial_name:     string;
  scheduled_at:       string;
  notes:              string | null;
  status:             "pendiente" | "completada" | "cancelada";
  created_at:         string;
};

type Section = { label: string; citas: Cita[]; accent: string };

const TZ = "Europe/Madrid";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "long",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit",
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildSections(citas: Cita[]): Section[] {
  const now      = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = new Date(todayStart.getTime() + 86400000);

  // next Sunday end (start of next-next week)
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay() || 7) + 1);

  const overdue:   Cita[] = [];
  const today:     Cita[] = [];
  const thisWeek:  Cita[] = [];
  const upcoming:  Cita[] = [];
  const completed: Cita[] = [];

  for (const c of citas) {
    const d = new Date(c.scheduled_at);
    if (c.status === "completada" || c.status === "cancelada") {
      completed.push(c);
    } else if (d < todayStart) {
      overdue.push(c);
    } else if (d >= todayStart && d < todayEnd) {
      today.push(c);
    } else if (d >= todayEnd && d < weekEnd) {
      thisWeek.push(c);
    } else {
      upcoming.push(c);
    }
  }

  return [
    { label: "Vencidas",      citas: overdue,   accent: "border-red-300 bg-red-50"     },
    { label: "Hoy",           citas: today,      accent: "border-indigo-300 bg-indigo-50" },
    { label: "Esta semana",   citas: thisWeek,   accent: "border-violet-300 bg-violet-50" },
    { label: "Próximas",      citas: upcoming,   accent: "border-slate-200 bg-slate-50"   },
    { label: "Completadas / Canceladas", citas: completed, accent: "border-slate-200 bg-white" },
  ].filter(s => s.citas.length > 0);
}

function CitaCard({ cita, onStatusChange }: { cita: Cita; onStatusChange: (id: string, s: "completada" | "cancelada") => void }) {
  const isPending = cita.status === "pendiente";
  const statusCls = {
    pendiente:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    completada: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    cancelada:  "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  }[cita.status];

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4",
      cita.status === "cancelada" && "opacity-60",
    )}>
      {/* Time column */}
      <div className="shrink-0 w-14 text-center">
        <p className="text-lg font-black text-indigo-600 leading-none">{formatTime(cita.scheduled_at)}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">1 hora</p>
      </div>

      {/* Divider */}
      <div className="w-px bg-slate-100 shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-sm font-black text-slate-900">{cita.contact_name}</p>
            {cita.contact_phone && (
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500">{cita.contact_phone}</span>
              </div>
            )}
          </div>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", statusCls)}>
            {cita.status.charAt(0).toUpperCase() + cita.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-2">
          <User className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500">{cita.comercial_name}</span>
        </div>

        {cita.notes && (
          <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2">
            {cita.notes}
          </p>
        )}

        {isPending && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onStatusChange(cita.id, "completada")}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completada
            </button>
            <button
              onClick={() => onStatusChange(cita.id, "cancelada")}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AgendaClient({ citas: initial, isAdmin }: { citas: Cita[]; isAdmin: boolean }) {
  const [citas,   setCitas]   = useState<Cita[]>(initial);
  const [pending, startTrans] = useTransition();
  const [showCompleted, setShowCompleted] = useState(false);

  function handleStatusChange(id: string, status: "completada" | "cancelada") {
    startTrans(async () => {
      const res = await updateCitaStatus(id, status);
      if ("error" in res) { toast.error(res.error); return; }
      setCitas(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(status === "completada" ? "Cita marcada como completada" : "Cita cancelada");
    });
  }

  const sections = buildSections(citas);
  const pendingCount = citas.filter(c => c.status === "pendiente").length;

  if (citas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <Calendar className="h-7 w-7 text-indigo-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">No hay citas agendadas</p>
        <p className="text-xs text-slate-400 mt-1">Las citas que agendes desde el pipeline aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Summary bar */}
      <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
        <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-black text-indigo-900">{pendingCount} cita{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""}</p>
          <p className="text-xs text-indigo-600">{citas.length} en total</p>
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => {
        const isCompleted = section.label === "Completadas / Canceladas";
        if (isCompleted && !showCompleted) return (
          <button
            key={section.label}
            onClick={() => setShowCompleted(true)}
            className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
            Ver {section.citas.length} completadas / canceladas
          </button>
        );

        return (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("h-px flex-1", section.accent.includes("red") ? "bg-red-200" : section.accent.includes("indigo") ? "bg-indigo-200" : section.accent.includes("violet") ? "bg-violet-200" : "bg-slate-200")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                {section.label} · {section.citas.length}
              </span>
              <div className={cn("h-px flex-1", section.accent.includes("red") ? "bg-red-200" : section.accent.includes("indigo") ? "bg-indigo-200" : section.accent.includes("violet") ? "bg-violet-200" : "bg-slate-200")} />
              {isCompleted && (
                <button onClick={() => setShowCompleted(false)} className="cursor-pointer text-slate-400 hover:text-slate-600 ml-1">
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Group by date within section */}
            {(() => {
              const byDate = section.citas.reduce<Record<string, Cita[]>>((acc, c) => {
                const key = new Date(c.scheduled_at).toLocaleDateString("es-ES", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
                (acc[key] ??= []).push(c);
                return acc;
              }, {});

              return Object.entries(byDate).map(([date, dayCitas]) => (
                <div key={date} className="mb-4">
                  <p className="text-[11px] font-bold text-slate-500 mb-2 capitalize">{date}</p>
                  <div className="space-y-2">
                    {dayCitas.map(c => (
                      <CitaCard key={c.id} cita={c} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        );
      })}
    </div>
  );
}
