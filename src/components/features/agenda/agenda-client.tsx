"use client";

import { useState, useMemo, useTransition } from "react";
import { ChevronLeft, ChevronRight, Phone, User, CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateCitaStatus } from "@/app/(app)/agenda/actions";

// ── Types ─────────────────────────────────────────────────────────────────────
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
type View = "day" | "week" | "month";

// ── Constants ─────────────────────────────────────────────────────────────────
const TZ         = "Europe/Madrid";
const HOUR_START = 7;
const HOUR_END   = 22;
const HOUR_H     = 64; // px per hour
const HOURS      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const DAYS_ES    = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES  = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function toLocal(iso: string) {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: TZ }));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const dow  = (copy.getDay() + 6) % 7; // 0 = Monday
  copy.setDate(copy.getDate() - dow);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function getMonthGrid(d: Date): (Date | null)[] {
  const year  = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  const days  = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let i = 1; i <= days; i++) cells.push(new Date(year, month, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function citaTopPx(cita: Cita): number {
  const d   = toLocal(cita.scheduled_at);
  const h   = d.getHours() + d.getMinutes() / 60;
  const max = (HOUR_END - HOUR_START - 1) * HOUR_H;
  return Math.max(0, Math.min((h - HOUR_START) * HOUR_H, max));
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit",
  });
}

// ── Status styles ─────────────────────────────────────────────────────────────
const CHIP_CLS: Record<string, string> = {
  pendiente:  "bg-indigo-500 text-white",
  completada: "bg-emerald-500 text-white",
  cancelada:  "bg-slate-400 text-white opacity-60",
};

const BLOCK_CLS: Record<string, string> = {
  pendiente:  "bg-indigo-50 border-l-2 border-indigo-500 text-indigo-900",
  completada: "bg-emerald-50 border-l-2 border-emerald-500 text-emerald-800",
  cancelada:  "bg-slate-100 border-l-2 border-slate-300 text-slate-500",
};

// ── CitaDetail ────────────────────────────────────────────────────────────────
function CitaDetail({
  cita, onClose, onStatusChange,
}: {
  cita:           Cita;
  onClose:        () => void;
  onStatusChange: (id: string, s: "completada" | "cancelada") => void;
}) {
  const statusLabel = { pendiente: "Pendiente", completada: "Completada", cancelada: "Cancelada" }[cita.status];
  const statusCls   = {
    pendiente:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    completada: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    cancelada:  "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  }[cita.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-base font-black text-slate-900">{cita.contact_name}</p>
            <p className="text-sm font-bold text-indigo-600 mt-0.5">{formatTime(cita.scheduled_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusCls)}>
              {statusLabel}
            </span>
            <button
              onClick={onClose}
              className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5 mb-4">
          {cita.contact_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-600">{cita.contact_phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-600">{cita.comercial_name}</span>
          </div>
        </div>

        {cita.notes && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 mb-4 leading-relaxed">
            {cita.notes}
          </p>
        )}

        {cita.status === "pendiente" && (
          <div className="flex gap-2">
            <button
              onClick={() => { onStatusChange(cita.id, "completada"); onClose(); }}
              className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completada
            </button>
            <button
              onClick={() => { onStatusChange(cita.id, "cancelada"); onClose(); }}
              className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
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

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({
  date, citas, onCitaClick,
}: {
  date:        Date;
  citas:       Cita[];
  onCitaClick: (c: Cita) => void;
}) {
  const cells = getMonthGrid(date);
  const today = new Date();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
        {DAYS_ES.map(d => (
          <div key={d} className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="overflow-auto flex-1">
        <div className="grid grid-cols-7 border-l border-slate-100">
          {cells.map((cell, i) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${i}`}
                  className="border-r border-b border-slate-100 min-h-[96px] bg-slate-50/50"
                />
              );
            }

            const dayCitas = citas.filter(c => isSameDay(toLocal(c.scheduled_at), cell));
            const isToday  = isSameDay(cell, today);
            const overflow = dayCitas.length - 3;

            return (
              <div
                key={cell.toISOString()}
                className="border-r border-b border-slate-100 min-h-[96px] p-1.5"
              >
                <div className={cn(
                  "text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-indigo-600 text-white" : "text-slate-500",
                )}>
                  {cell.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayCitas.slice(0, 3).map(c => (
                    <button
                      key={c.id}
                      onClick={() => onCitaClick(c)}
                      className={cn(
                        "cursor-pointer w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded truncate leading-tight",
                        CHIP_CLS[c.status],
                      )}
                    >
                      {formatTime(c.scheduled_at)} {c.contact_name}
                    </button>
                  ))}
                  {overflow > 0 && (
                    <p className="text-[10px] text-slate-400 px-1 font-medium">
                      +{overflow} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Time Grid (Week & Day) ────────────────────────────────────────────────────
function TimeGrid({
  days, citas, onCitaClick,
}: {
  days:        Date[];
  citas:       Cita[];
  onCitaClick: (c: Cita) => void;
}) {
  const today    = new Date();
  const nowLocal = toLocal(new Date().toISOString());
  const nowTop   = (nowLocal.getHours() + nowLocal.getMinutes() / 60 - HOUR_START) * HOUR_H;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day headers — sticky */}
      <div className="flex border-b border-slate-200 shrink-0 bg-white">
        <div className="w-14 shrink-0" />
        {days.map(d => (
          <div
            key={d.toISOString()}
            className="flex-1 min-w-0 py-2.5 text-center border-l border-slate-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {DAYS_ES[(d.getDay() + 6) % 7]}
            </p>
            <p className={cn(
              "text-lg font-black mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full",
              isSameDay(d, today) ? "bg-indigo-600 text-white" : "text-slate-800",
            )}>
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="overflow-auto flex-1">
        <div className="flex relative" style={{ height: HOURS.length * HOUR_H }}>

          {/* Hour labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map(h => (
              <div
                key={h}
                style={{ top: (h - HOUR_START) * HOUR_H - 9 }}
                className="absolute right-2 text-[10px] text-slate-400 font-medium tabular-nums"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayCitas = citas.filter(c => isSameDay(toLocal(c.scheduled_at), day));

            return (
              <div
                key={day.toISOString()}
                className="flex-1 min-w-0 relative border-l border-slate-100"
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ top: (h - HOUR_START) * HOUR_H }}
                    className="absolute inset-x-0 border-t border-slate-100"
                  />
                ))}

                {/* "Now" indicator */}
                {isSameDay(day, today) && nowTop >= 0 && nowTop <= HOURS.length * HOUR_H && (
                  <div
                    style={{ top: nowTop }}
                    className="absolute inset-x-0 flex items-center z-10 pointer-events-none"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
                    <div className="flex-1 h-[1.5px] bg-red-400" />
                  </div>
                )}

                {/* Citas */}
                {dayCitas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onCitaClick(c)}
                    style={{ top: citaTopPx(c) + 1, height: HOUR_H - 4 }}
                    className={cn(
                      "cursor-pointer absolute inset-x-1 rounded-lg px-2 py-1 text-left overflow-hidden transition-opacity hover:opacity-80",
                      BLOCK_CLS[c.status],
                    )}
                  >
                    <p className="text-[10px] font-bold leading-none">{formatTime(c.scheduled_at)}</p>
                    <p className="text-[11px] font-semibold leading-tight mt-0.5 line-clamp-2">
                      {c.contact_name}
                    </p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
type StaffMember = { id: string; full_name: string | null };

export function AgendaClient({
  citas: initial, isAdmin, staff,
}: {
  citas:   Cita[];
  isAdmin: boolean;
  staff:   StaffMember[];
}) {
  const [citas,        setCitas]        = useState<Cita[]>(initial);
  const [view,         setView]         = useState<View>("week");
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [filterUser,   setFilterUser]   = useState("all");
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [, startTrans] = useTransition();

  // Filtered citas
  const filtered = useMemo(() => {
    if (filterUser === "all") return citas;
    return citas.filter(c => c.comercial_id === filterUser);
  }, [citas, filterUser]);

  function handleStatusChange(id: string, status: "completada" | "cancelada") {
    startTrans(async () => {
      const res = await updateCitaStatus(id, status);
      if ("error" in res) { toast.error(res.error); return; }
      setCitas(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(status === "completada" ? "Cita completada" : "Cita cancelada");
    });
  }

  // Navigation
  function navigate(dir: -1 | 1) {
    setCurrentDate(prev => {
      if (view === "month") return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      if (view === "week")  return addDays(prev, dir * 7);
      return addDays(prev, dir);
    });
  }

  // Title
  const title = useMemo(() => {
    if (view === "month") {
      return `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === "week") {
      const mon = startOfWeek(currentDate);
      const sun = addDays(mon, 6);
      if (mon.getMonth() === sun.getMonth()) {
        return `${mon.getDate()} – ${sun.getDate()} ${MONTHS_ES[mon.getMonth()]} ${mon.getFullYear()}`;
      }
      return `${mon.getDate()} ${MONTHS_ES[mon.getMonth()].slice(0, 3)} – ${sun.getDate()} ${MONTHS_ES[sun.getMonth()].slice(0, 3)} ${sun.getFullYear()}`;
    }
    return currentDate.toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }, [view, currentDate]);

  // Days for week/day views
  const days = useMemo(() => {
    if (view === "week") {
      const mon = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    }
    return [currentDate];
  }, [view, currentDate]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 180px)" }}>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">

        {/* Person filter — admin only */}
        {isAdmin && staff.length > 0 && (
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="all">Todos</option>
            {staff.map(u => (
              <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
            ))}
          </select>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="cursor-pointer p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <p className="text-sm font-black text-slate-800 capitalize flex-1 min-w-0 truncate">
          {title}
        </p>

        {/* View toggle */}
        <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0">
          {(["day", "week", "month"] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "cursor-pointer px-3 py-2 text-xs font-semibold transition-colors",
                view === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50",
              )}
            >
              {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
        {view === "month" && (
          <MonthView date={currentDate} citas={filtered} onCitaClick={setSelectedCita} />
        )}
        {(view === "week" || view === "day") && (
          <TimeGrid days={days} citas={filtered} onCitaClick={setSelectedCita} />
        )}
      </div>

      {/* Cita detail */}
      {selectedCita && (
        <CitaDetail
          cita={selectedCita}
          onClose={() => setSelectedCita(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
