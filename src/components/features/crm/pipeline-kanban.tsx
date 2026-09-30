"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, ArrowRight, GraduationCap, Mail, Clock, CalendarPlus, Flame, Thermometer, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { LeadSheet } from "./lead-sheet";
import { cn, fmt } from "@/lib/utils";
import { moveOppToStage } from "@/app/(app)/crm/pipeline/actions";
import type { GhlPipeline, GhlPipelineStage, OppEnriched } from "@/lib/data/ghl-pipeline.repository";

// ── Stage config ──────────────────────────────────────────────────────────────
type StageConfig = {
  dot:    string;
  card:   string;
  header: string;
  zone:   "setter" | "closer";
};

const STAGE_CFG: Record<string, StageConfig> = {
  "lead nuevo":     { dot: "bg-slate-400",   card: "border-l-slate-300",   header: "bg-slate-500",   zone: "setter" },
  "contactando":    { dot: "bg-sky-500",     card: "border-l-sky-400",     header: "bg-sky-600",     zone: "setter" },
  "cualificando":   { dot: "bg-indigo-500",  card: "border-l-indigo-400",  header: "bg-indigo-600",  zone: "setter" },
  "cita agendada":  { dot: "bg-amber-500",   card: "border-l-amber-400",   header: "bg-amber-500",   zone: "setter" },
  "no asistio":     { dot: "bg-orange-500",  card: "border-l-orange-400",  header: "bg-orange-500",  zone: "closer" },
  "en seguimiento": { dot: "bg-violet-500",  card: "border-l-violet-400",  header: "bg-violet-600",  zone: "closer" },
  "pago pendiente": { dot: "bg-yellow-500",  card: "border-l-yellow-400",  header: "bg-yellow-500",  zone: "closer" },
  "matriculado":    { dot: "bg-emerald-500", card: "border-l-emerald-400", header: "bg-emerald-600", zone: "closer" },
  "perdido":        { dot: "bg-red-400",     card: "border-l-red-300",     header: "bg-red-500",     zone: "closer" },
  "no cualificado": { dot: "bg-gray-400",    card: "border-l-gray-300",    header: "bg-gray-500",    zone: "closer" },
};

function getStageCfg(name: string): StageConfig {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const key  = norm(name);
  for (const [k, v] of Object.entries(STAGE_CFG)) {
    if (key.includes(norm(k)) || norm(k).includes(key)) return v;
  }
  return { dot: "bg-slate-400", card: "border-l-slate-300", header: "bg-slate-500", zone: "setter" };
}

// ── Phase groupings ───────────────────────────────────────────────────────────
type Phase = { id: string; label: string; stageKeys: string[]; color: string };

const PHASES: Phase[] = [
  { id: "prospeccion", label: "Prospección", stageKeys: ["lead nuevo", "contactando", "cualificando"],       color: "text-sky-600" },
  { id: "citas",       label: "Citas",       stageKeys: ["cita agendada", "no asistio"],                     color: "text-amber-600" },
  { id: "seguimiento", label: "Seguimiento", stageKeys: ["en seguimiento", "pago pendiente"],                color: "text-violet-600" },
  { id: "resultados",  label: "Resultados",  stageKeys: ["matriculado", "perdido", "no cualificado"],        color: "text-slate-600" },
];

function phaseForStage(name: string): Phase | undefined {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const key  = norm(name);
  return PHASES.find(ph => ph.stageKeys.some(k => key.includes(norm(k)) || norm(k).includes(key)));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PROSPECTION_KEYS = ["lead nuevo", "contactando", "cualificando"];

function normStr(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function isProspectionStage(stageName: string | null | undefined): boolean {
  if (!stageName?.trim()) return false;
  const key = normStr(stageName);
  return PROSPECTION_KEYS.some(k => key.includes(normStr(k)));
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "from-sky-400 to-sky-600",
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
];

// ── OppCard — BIGGER, more prominent ─────────────────────────────────────────
function OppCard({
  opp, onOpen, onDragStart,
}: {
  opp:         OppEnriched;
  onOpen:      (opp: OppEnriched) => void;
  onDragStart: (opp: OppEnriched) => void;
}) {
  const cfg       = getStageCfg(opp.pipelineStageName ?? "");
  const avatarIdx = opp.contact.name.charCodeAt(0) % 5;

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(opp); }}
      onClick={() => onOpen(opp)}
      className={cn(
        "bg-white rounded-xl border border-slate-200 border-l-4 p-4 shadow-sm",
        "hover:shadow-md hover:translate-y-[-1px] transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.98]",
        cfg.card
      )}
    >
      {/* Avatar + nombre */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 bg-gradient-to-br shadow-sm",
          AVATAR_COLORS[avatarIdx]
        )}>
          {initials(opp.contact.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight truncate">
            {opp.contact.name}
          </p>
          {opp.contact.phone && (
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{opp.contact.phone}</p>
          )}
        </div>
      </div>

      {/* Email */}
      {opp.contact.email && (
        <div className="flex items-center gap-1.5 mb-2">
          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
          <p className="text-[11px] text-slate-500 truncate">{opp.contact.email}</p>
        </div>
      )}

      {/* Origen */}
      {opp.origenLead && (
        <div className="mb-2">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
            {opp.origenLead}
          </span>
        </div>
      )}

      {/* Curso */}
      {opp.cursoValue && (
        <div className="flex items-center gap-1.5 mb-2">
          <GraduationCap className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <p className="text-[11px] font-semibold text-indigo-600 truncate">{opp.cursoValue}</p>
        </div>
      )}

      {/* Temperatura + importe — destacados */}
      {(opp.temperatura || opp.importe_previsto) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {opp.temperatura && (() => {
            const cfg = {
              caliente: { cls: "bg-red-50 text-red-600 border-red-200",     Icon: Flame,       label: "Caliente" },
              templada: { cls: "bg-amber-50 text-amber-600 border-amber-200", Icon: Thermometer, label: "Templado" },
              fria:     { cls: "bg-sky-50 text-sky-600 border-sky-200",      Icon: Snowflake,   label: "Frío"     },
            }[opp.temperatura] ?? { cls: "bg-slate-50 text-slate-500 border-slate-200", Icon: Thermometer, label: opp.temperatura };
            return (
              <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border", cfg.cls)}>
                <cfg.Icon className="h-3 w-3" />{cfg.label}
              </span>
            );
          })()}
          {opp.importe_previsto && (
            <span className="text-sm font-black text-emerald-700 ml-auto">{fmt(opp.importe_previsto)}</span>
          )}
        </div>
      )}

      {/* Fechas */}
      <div className="flex flex-col gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <CalendarPlus className="h-3 w-3 text-slate-300 shrink-0" />
          <span className="text-[10px] text-slate-400 tabular-nums">{fmtDateTime(opp.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-slate-300 shrink-0" />
          <span className="text-[10px] text-slate-400 tabular-nums">{fmtDateTime(opp.updatedAt)}</span>
        </div>
      </div>

      {/* Footer: valor GHL */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        {opp.monetaryValue && !opp.importe_previsto ? (
          <span className="text-xs font-bold text-emerald-600">{fmt(opp.monetaryValue)}</span>
        ) : (
          <span />
        )}
        <ArrowRight className="h-3 w-3 text-indigo-400" />
      </div>
    </div>
  );
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────
function KanbanColumn({
  stage, opps, onOpen, onDragStart, onDrop, onDragOver, onDragLeave, isDragOver,
}: {
  stage:       GhlPipelineStage;
  opps:        OppEnriched[];
  onOpen:      (opp: OppEnriched) => void;
  onDragStart: (opp: OppEnriched) => void;
  onDrop:      (stageId: string) => void;
  onDragOver:  (stageId: string) => void;
  onDragLeave: () => void;
  isDragOver:  boolean;
}) {
  const cfg      = getStageCfg(stage.name);
  const colValue = opps.reduce((s, o) => s + (o.monetaryValue ?? 0), 0);

  return (
    <div className="flex flex-col w-[260px] shrink-0">
      {/* Header */}
      <div className={cn("rounded-t-xl px-3.5 py-3", cfg.header)}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-white truncate">{stage.name}</p>
          <span className="shrink-0 text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full min-w-[22px] text-center">
            {opps.length}
          </span>
        </div>
        {colValue > 0 && (
          <p className="text-[11px] text-white/75 mt-0.5 font-medium">{fmt(colValue)}</p>
        )}
      </div>

      {/* Cards area — drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); onDragOver(stage.id); }}
        onDragLeave={onDragLeave}
        onDrop={e => { e.preventDefault(); onDrop(stage.id); }}
        className={cn(
          "flex-1 rounded-b-xl p-2 space-y-2 min-h-[200px] overflow-y-auto transition-colors",
          isDragOver
            ? "bg-indigo-50 ring-2 ring-indigo-300 ring-inset"
            : "bg-slate-100/70"
        )}
      >
        {opps.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-8">
            {isDragOver ? "Soltar aquí" : "Vacío"}
          </p>
        ) : (
          opps.map(opp => (
            <OppCard key={opp.id} opp={opp} onOpen={onOpen} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

// ── PhaseGroup ────────────────────────────────────────────────────────────────
function PhaseGroup({
  phase, stages, opps, onOpen, onDragStart, onDrop, onDragOver, onDragLeave, dragOver,
}: {
  phase:       Phase;
  stages:      GhlPipelineStage[];
  opps:        OppEnriched[];
  onOpen:      (opp: OppEnriched) => void;
  onDragStart: (opp: OppEnriched) => void;
  onDrop:      (stageId: string) => void;
  onDragOver:  (stageId: string) => void;
  onDragLeave: () => void;
  dragOver:    string | null;
}) {
  if (stages.length === 0) return null;

  const phaseOpps = opps.filter(o => stages.some(s => s.id === o.pipelineStageId));

  return (
    <div className="flex flex-col gap-2">
      {/* Phase label — minimal, just a line */}
      <div className="flex items-center gap-2 px-1">
        <p className={cn("text-[10px] font-black uppercase tracking-widest", phase.color)}>
          {phase.label}
        </p>
        <p className="text-[10px] text-slate-400">{phaseOpps.length} leads</p>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {/* Columns */}
      <div className="flex gap-2.5">
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            opps={opps.filter(o => o.pipelineStageId === stage.id)}
            onOpen={onOpen}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            isDragOver={dragOver === stage.id}
          />
        ))}
      </div>
    </div>
  );
}

// ── ListView ──────────────────────────────────────────────────────────────────
function ListView({ opps, onOpen }: { opps: OppEnriched[]; onOpen: (opp: OppEnriched) => void }) {
  const STATUS_CLS: Record<string, string> = {
    open:      "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60",
    won:       "bg-green-50 text-green-600 ring-1 ring-green-200/60",
    lost:      "bg-red-50 text-red-500 ring-1 ring-red-200/60",
    abandoned: "bg-gray-50 text-gray-500 ring-1 ring-gray-200/60",
  };
  const STATUS_LBL: Record<string, string> = {
    open: "Abierta", won: "Ganada", lost: "Perdida", abandoned: "Abandonada",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacto</th>
            <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Etapa</th>
            <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Curso</th>
            <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor</th>
            <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
            <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Hace</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {opps.map(opp => {
            const cfg       = getStageCfg(opp.pipelineStageName ?? "");
            const avatarIdx = opp.contact.name.charCodeAt(0) % 5;
            return (
              <tr key={opp.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 bg-gradient-to-br",
                      AVATAR_COLORS[avatarIdx]
                    )}>
                      {initials(opp.contact.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{opp.contact.name}</p>
                      <p className="text-[10px] text-slate-400">{opp.contact.phone ?? opp.contact.email ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                    <span className="text-xs text-slate-600">{opp.pipelineStageName ?? "—"}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500 max-w-[160px] truncate">{opp.cursoValue ?? "—"}</td>
                <td className="px-5 py-3 text-right text-xs font-bold text-emerald-600 tabular-nums">
                  {opp.monetaryValue ? fmt(opp.monetaryValue) : "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_CLS[opp.status] ?? "bg-slate-100 text-slate-500")}>
                    {STATUS_LBL[opp.status] ?? opp.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">{fmtDateTime(opp.updatedAt)}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => onOpen(opp)}
                    className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    Ver <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Props = {
  pipelines:      GhlPipeline[];
  oppsByPipeline: Record<string, OppEnriched[]>;
};

export function PipelineKanban({ pipelines, oppsByPipeline }: Props) {
  const router = useRouter();
  const [activePipelineId, setActivePipelineId] = useState(pipelines[0]?.id ?? "");
  const [view, setView]         = useState<"kanban" | "list">("kanban");
  const [zone, setZone]         = useState<"all" | "setter" | "closer">("all");
  const [sheetOpp, setSheetOpp] = useState<OppEnriched | null>(null);

  // ── Drag & drop state ──────────────────────────────────────────────────────
  const [dragId, setDragId]             = useState<string | null>(null);
  const [dragOver, setDragOver]         = useState<string | null>(null);
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [, startTransition]             = useTransition();

  function handleDragStart(opp: OppEnriched) {
    setDragId(opp.id);
  }

  function handleDragOver(stageId: string) {
    const opp         = visibleOpps.find(o => o.id === dragId);
    const targetStage = pipeline?.stages.find(s => s.id === stageId);
    // Don't highlight if move would be blocked
    if (
      opp &&
      isProspectionStage(opp.pipelineStageName) &&
      !isProspectionStage(targetStage?.name) &&
      !opp.temperatura
    ) return;
    setDragOver(stageId);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  function handleDrop(stageId: string) {
    if (!dragId) { setDragOver(null); return; }

    const opp         = visibleOpps.find(o => o.id === dragId);
    const targetStage = pipeline?.stages.find(s => s.id === stageId);

    // Bloquear salida de prospección sin ficha rellena
    if (
      opp &&
      isProspectionStage(opp.pipelineStageName) &&
      !isProspectionStage(targetStage?.name) &&
      !opp.temperatura
    ) {
      toast.error("Rellena la ficha de cualificación antes de mover este lead a una etapa posterior");
      setDragId(null);
      setDragOver(null);
      return;
    }

    const id   = dragId;
    const prev = { ...stageOverrides };
    setDragId(null);
    setDragOver(null);
    setStageOverrides(p => ({ ...p, [id]: stageId }));

    startTransition(async () => {
      const res = await moveOppToStage(
        id,
        stageId,
        opp?.contact.id,
        opp?.pipelineStageName ?? undefined,
        targetStage?.name ?? undefined,
      );
      if ("error" in res) {
        toast.error("No se pudo mover el lead");
        setStageOverrides(prev);
      }
    });
  }

  const pipeline  = pipelines.find(p => p.id === activePipelineId);
  const allOpps   = oppsByPipeline[activePipelineId] ?? [];
  // Exclude won (matriculados) — lost/abandoned still show in their columns
  const openOpps    = allOpps.filter(o => o.status !== "won");
  const visibleOpps = zone === "all" ? openOpps : openOpps.filter(o => o.zone === zone);

  // Apply stageOverrides — update both pipelineStageId AND pipelineStageName
  const resolvedOpps = visibleOpps.map(o => {
    const newStageId = stageOverrides[o.id];
    if (!newStageId) return o;
    const newStageName = pipeline?.stages.find(s => s.id === newStageId)?.name ?? o.pipelineStageName;
    return { ...o, pipelineStageId: newStageId, pipelineStageName: newStageName };
  });

  // Build phase → stages map
  const stagesByPhase = PHASES.map(phase => ({
    phase,
    stages: (pipeline?.stages ?? []).filter(s =>
      phase.stageKeys.some(k => {
        const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return norm(s.name).includes(norm(k)) || norm(k).includes(norm(s.name));
      })
    ),
  }));

  const matchedIds      = new Set(stagesByPhase.flatMap(x => x.stages.map(s => s.id)));
  const unmatchedStages = (pipeline?.stages ?? []).filter(s => !matchedIds.has(s.id));

  const dragHandlers = {
    onDragStart:  handleDragStart,
    onDrop:       handleDrop,
    onDragOver:   handleDragOver,
    onDragLeave:  handleDragLeave,
    dragOver,
  };

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Top bar: KPIs + toolbar ── */}
      <div className="flex items-center gap-4 flex-wrap">

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zone + view controls */}
        <div className="flex items-center gap-2">
          {pipelines.length > 1 && (
            <select
              value={activePipelineId}
              onChange={e => setActivePipelineId(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            {(["all", "setter", "closer"] as const).map(z => (
              <button
                key={z}
                onClick={() => setZone(z)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-xs font-semibold transition-colors",
                  zone === z ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {z === "all" ? "Todos" : z === "setter" ? "Setter" : "Closer"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium px-2">
            {allOpps.filter(o => o.status === "open").length} leads activos
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={cn("cursor-pointer p-2 transition-colors", view === "kanban" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("cursor-pointer p-2 transition-colors", view === "list" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Kanban / List ── */}
      {view === "kanban" ? (
        <div className="overflow-x-auto pb-4 flex-1">
          <div className="flex gap-0 items-start" style={{ minWidth: "max-content", height: "calc(100vh - 220px)" }}>
            {stagesByPhase.map(({ phase, stages }, pi) =>
              stages.length > 0 ? (
                <div key={phase.id} className="flex items-start gap-2.5">
                  {/* Phase separator — thin vertical line with label */}
                  {pi > 0 && (
                    <div className="flex flex-col items-center self-stretch pt-1 px-1">
                      <div className="w-px flex-1 bg-slate-200" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pr-1">
                    {/* Phase label above the group */}
                    <p className={cn("text-[9px] font-black uppercase tracking-widest px-1", phase.color)}>
                      {phase.label}
                    </p>
                    <div className="flex gap-2.5">
                      {stages.map(stage => (
                        <KanbanColumn
                          key={stage.id}
                          stage={stage}
                          opps={resolvedOpps.filter(o => o.pipelineStageId === stage.id)}
                          onOpen={setSheetOpp}
                          onDragStart={handleDragStart}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          isDragOver={dragOver === stage.id}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null
            )}
            {unmatchedStages.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opps={resolvedOpps.filter(o => o.pipelineStageId === stage.id)}
                onOpen={setSheetOpp}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                isDragOver={dragOver === stage.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <ListView opps={resolvedOpps} onOpen={setSheetOpp} />
      )}

      {sheetOpp && (
        <LeadSheet
          opp={sheetOpp}
          stages={pipeline?.stages ?? []}
          onClose={() => setSheetOpp(null)}
          onAction={() => { setSheetOpp(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
