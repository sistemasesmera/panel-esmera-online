"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X, Phone, PhoneMissed, MessageCircle, Mail, FileText,
  Paperclip, Send, Loader2, Download, GraduationCap, User,
  CreditCard, ClipboardList, Flame, Thermometer, Snowflake,
  BookOpen, Euro, CheckCircle2, Calendar, Pencil,
} from "lucide-react";
import {
  createLeadActivity,
  markLeadAsLost,
  markLeadAsUnqualified,
  upsertLeadProfile,
  generateEnrollment,
  scheduleAppointment,
  updateCitaStatus as _updateCitaStatus,
  updateLeadContactInfo,
  assignLeadMember,
} from "@/app/(app)/crm/pipeline/actions";
import {
  LOST_REASONS, type LostReason,
  UNQUALIFIED_REASONS, type UnqualifiedReason,
} from "@/lib/domain/crm/lead-status";
import { cn } from "@/lib/utils";
import type { OppEnriched } from "@/lib/data/ghl-pipeline.repository";
import type { GhlPipelineStage } from "@/lib/ghl/api";
import type { LeadNote, NoteType } from "@/lib/data/lead-notes.repository";
import type {
  LeadProfile, Experiencia, DispuestoInvertir, QuienDecide, Temperatura,
} from "@/lib/data/lead-profiles.repository";

// ── Types ─────────────────────────────────────────────────────────────────────
type Course   = { id: string; name: string; price: number | null };
type Platform = { id: string; name: string };
type Tutor    = { id: string; full_name: string };

// ── Activity type config ──────────────────────────────────────────────────────
type TypeDef = {
  label: string;
  Icon:  React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
};

const TYPE_DEF: Record<NoteType, TypeDef> = {
  llamada:     { label: "Llamada",     Icon: Phone,         color: "bg-emerald-100 text-emerald-600", badge: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60" },
  no_contesto: { label: "No contestó", Icon: PhoneMissed,   color: "bg-orange-100 text-orange-600",  badge: "bg-orange-50 text-orange-600 ring-1 ring-orange-200/60" },
  whatsapp:    { label: "WhatsApp",    Icon: MessageCircle, color: "bg-teal-100 text-teal-600",      badge: "bg-teal-50 text-teal-600 ring-1 ring-teal-200/60" },
  email:       { label: "Email",       Icon: Mail,          color: "bg-sky-100 text-sky-600",        badge: "bg-sky-50 text-sky-600 ring-1 ring-sky-200/60" },
  nota:        { label: "Nota",        Icon: FileText,      color: "bg-violet-100 text-violet-600",  badge: "bg-violet-50 text-violet-600 ring-1 ring-violet-200/60" },
};

const NOTE_TYPES = Object.keys(TYPE_DEF) as NoteType[];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEur(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

// ── Radio group primitive ─────────────────────────────────────────────────────
function RadioGroup<T extends string>({
  value, onChange, options,
}: {
  value:    T | null;
  onChange: (v: T) => void;
  options:  { value: T; label: string; cls: string; activeCls: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
            value === o.value ? o.activeCls : cn("border-slate-200 text-slate-500 hover:border-slate-300 bg-white", o.cls)
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Temperatura config ────────────────────────────────────────────────────────
const TEMP_OPTIONS: { value: Temperatura; label: string; cls: string; activeCls: string }[] = [
  { value: "caliente", label: "Caliente", cls: "", activeCls: "bg-red-500 border-red-500 text-white" },
  { value: "templada", label: "Templada", cls: "", activeCls: "bg-amber-400 border-amber-400 text-white" },
  { value: "fria",     label: "Fría",     cls: "", activeCls: "bg-sky-500 border-sky-500 text-white" },
];

function TemperaturaIcon({ t }: { t: Temperatura }) {
  if (t === "caliente") return <Flame       className="h-3.5 w-3.5" />;
  if (t === "templada") return <Thermometer className="h-3.5 w-3.5" />;
  return <Snowflake className="h-3.5 w-3.5" />;
}

function TempBadge({ t }: { t: Temperatura }) {
  const map = {
    caliente: "bg-red-50 border border-red-200 text-red-700",
    templada: "bg-amber-50 border border-amber-200 text-amber-700",
    fria:     "bg-sky-50 border border-sky-200 text-sky-700",
  };
  const labels = { caliente: "Caliente 🔥", templada: "Templado", fria: "Frío" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-black px-3 py-1 rounded-xl", map[t])}>
      <TemperaturaIcon t={t} />{labels[t]}
    </span>
  );
}

// ── Ficha de cualificación modal ──────────────────────────────────────────────
type FichaFormData = {
  curso_interes_id:   string | null;
  importe_previsto:   string;
  objetivo:           string;
  horas_semana:       string;
  cuando_empezar:     string;
  experiencia:        Experiencia | null;
  dispuesto_invertir: DispuestoInvertir | null;
  quien_decide:       QuienDecide | null;
  quien_otra_persona: string;
  dudas_objeciones:   string;
  temperatura:        Temperatura | null;
  frase_clave:        string;
};

function buildFichaForm(p: Partial<LeadProfile>): FichaFormData {
  return {
    curso_interes_id:   p.curso_interes_id   ?? null,
    importe_previsto:   p.importe_previsto != null ? String(p.importe_previsto) : "",
    objetivo:           p.objetivo           ?? "",
    horas_semana:       p.horas_semana       ?? "",
    cuando_empezar:     p.cuando_empezar     ?? "",
    experiencia:        p.experiencia        ?? null,
    dispuesto_invertir: p.dispuesto_invertir ?? null,
    quien_decide:       p.quien_decide       ?? null,
    quien_otra_persona: p.quien_otra_persona ?? "",
    dudas_objeciones:   p.dudas_objeciones   ?? "",
    temperatura:        p.temperatura        ?? null,
    frase_clave:        p.frase_clave        ?? "",
  };
}

function FichaModal({
  opp, initial, courses, onSave, onCancel, pending, error,
}: {
  opp:      OppEnriched;
  initial:  Partial<LeadProfile>;
  courses:  Course[];
  onSave:   (data: FichaFormData) => void;
  onCancel: () => void;
  pending:  boolean;
  error:    string | null;
}) {
  const [form, setForm] = useState<FichaFormData>(() => buildFichaForm(initial));
  const set = <K extends keyof FichaFormData>(k: K, v: FichaFormData[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const fieldCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow placeholder:text-slate-300";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white w-full sm:rounded-2xl sm:mx-4 sm:max-w-lg shadow-2xl animate-slide-up flex flex-col max-h-[92dvh]">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-teal-100 flex items-center justify-center">
              <ClipboardList className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Ficha de cualificación</p>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">{opp.contact.name}</p>
            </div>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Curso de interés + Importe */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Curso de interés</label>
              <select
                value={form.curso_interes_id ?? ""}
                onChange={e => set("curso_interes_id", e.target.value || null)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow"
              >
                <option value="">— Sin seleccionar —</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className={labelCls}>Importe (€)</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={form.importe_previsto}
                  onChange={e => set("importe_previsto", e.target.value)}
                  placeholder="0"
                  className="w-full text-sm border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Su objetivo */}
          <div>
            <label className={labelCls}>Su objetivo · con sus palabras</label>
            <textarea
              rows={3}
              value={form.objetivo}
              onChange={e => set("objetivo", e.target.value)}
              placeholder="¿Qué quiere conseguir el lead? Escríbelo como él lo dijo..."
              className={cn(fieldCls, "resize-none")}
            />
          </div>

          {/* Horas / Cuándo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Horas por semana</label>
              <input type="text" value={form.horas_semana} onChange={e => set("horas_semana", e.target.value)} placeholder="Ej: 2-3h" className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Cuándo quiere empezar</label>
              <input type="text" value={form.cuando_empezar} onChange={e => set("cuando_empezar", e.target.value)} placeholder="Ej: Lo antes posible" className={fieldCls} />
            </div>
          </div>

          {/* Experiencia */}
          <div>
            <label className={labelCls}>Experiencia</label>
            <RadioGroup<Experiencia>
              value={form.experiencia}
              onChange={v => set("experiencia", v)}
              options={[
                { value: "de_cero",          label: "De cero",          cls: "", activeCls: "bg-slate-700 border-slate-700 text-white" },
                { value: "algo_de_base",      label: "Algo de base",     cls: "", activeCls: "bg-indigo-600 border-indigo-600 text-white" },
                { value: "experimentado",      label: "Experimentado",    cls: "", activeCls: "bg-emerald-600 border-emerald-600 text-white" },
              ]}
            />
          </div>

          {/* Dispuesto a invertir */}
          <div>
            <label className={labelCls}>¿Dispuesto a invertir?</label>
            <RadioGroup<DispuestoInvertir>
              value={form.dispuesto_invertir}
              onChange={v => set("dispuesto_invertir", v)}
              options={[
                { value: "si",      label: "Sí",                    cls: "", activeCls: "bg-emerald-600 border-emerald-600 text-white" },
                { value: "no",      label: "No",                    cls: "", activeCls: "bg-red-600 border-red-600 text-white" },
                { value: "depende", label: "Depende de lo que vea",  cls: "", activeCls: "bg-amber-500 border-amber-500 text-white" },
              ]}
            />
          </div>

          {/* Quién decide */}
          <div>
            <label className={labelCls}>¿Quién decide?</label>
            <RadioGroup<QuienDecide>
              value={form.quien_decide}
              onChange={v => set("quien_decide", v)}
              options={[
                { value: "el_ella",      label: "Él / Ella",       cls: "", activeCls: "bg-indigo-600 border-indigo-600 text-white" },
                { value: "otra_persona", label: "Con otra persona", cls: "", activeCls: "bg-violet-600 border-violet-600 text-white" },
              ]}
            />
            {form.quien_decide === "otra_persona" && (
              <input
                type="text"
                value={form.quien_otra_persona}
                onChange={e => set("quien_otra_persona", e.target.value)}
                placeholder="¿Quién? Pareja, socio, familiar..."
                className={cn(fieldCls, "mt-2")}
              />
            )}
          </div>

          {/* Dudas y objeciones */}
          <div>
            <label className={labelCls}>Dudas y objeciones</label>
            <textarea
              rows={3}
              value={form.dudas_objeciones}
              onChange={e => set("dudas_objeciones", e.target.value)}
              placeholder="¿Qué dudas o pegas ha puesto el lead?"
              className={cn(fieldCls, "resize-none")}
            />
          </div>

          {/* Temperatura */}
          <div>
            <label className={labelCls}>Temperatura</label>
            <div className="flex gap-2">
              {TEMP_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set("temperatura", o.value)}
                  className={cn(
                    "cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border transition-all",
                    form.temperatura === o.value ? o.activeCls : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                  )}
                >
                  <TemperaturaIcon t={o.value} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frase clave */}
          <div>
            <label className={labelCls}>Frase clave del lead</label>
            <input type="text" value={form.frase_clave} onChange={e => set("frase_clave", e.target.value)} placeholder="La frase que más te llamó la atención..." className={fieldCls} />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={pending}
            className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-colors"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar ficha
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Enrollment modal ──────────────────────────────────────────────────────────
type PaymentType   = "contado" | "financiado";
type PaymentOption = "efectivo" | "transferencia" | "sabadell" | "sequra" | "esmera";

const PAYMENT_OPTIONS: Record<PaymentType, { value: PaymentOption; label: string }[]> = {
  contado:    [{ value: "efectivo",      label: "Efectivo"         },
               { value: "transferencia", label: "Transferencia"    }],
  financiado: [{ value: "sabadell",      label: "Banco Sabadell"   },
               { value: "sequra",        label: "SeQura"           },
               { value: "esmera",        label: "Financiado Esmera"}],
};

function EnrollmentModal({
  opp, courses, platforms, tutors, initialCourseId, initialAmount, onConfirm, onCancel, pending, error, mode = "enroll",
}: {
  opp:             OppEnriched;
  courses:         Course[];
  platforms:       Platform[];
  tutors:          Tutor[];
  initialCourseId: string | null;
  initialAmount:   number | null;
  onConfirm:       (courseId: string, amount: number, paymentType: PaymentType, paymentOption: PaymentOption, durationMonths: number | null, platformId: string | null, tutorId: string | null) => void;
  onCancel:        () => void;
  pending:         boolean;
  error:           string | null;
  mode?:           "enroll" | "simulate";
}) {
  const [courseId,       setCourseId]       = useState(initialCourseId ?? "");
  const [amount,         setAmount]         = useState(initialAmount != null ? String(initialAmount) : "");
  const [paymentType,    setPaymentType]    = useState<PaymentType | null>(null);
  const [paymentOption,  setPaymentOption]  = useState<PaymentOption | null>(null);
  const [durationMonths, setDurationMonths] = useState("");
  const [platformId,     setPlatformId]     = useState(() => platforms[0]?.id ?? "");
  const [tutorId,        setTutorId]        = useState(() => tutors.length === 1 ? tutors[0].id : "");
  const [localErr,       setLocalErr]       = useState<string | null>(null);

  const selectedCourse = courses.find(c => c.id === courseId);

  function handleConfirm() {
    if (!courseId)      { setLocalErr("Selecciona un curso"); return; }
    const n = parseFloat(amount);
    if (!n || n <= 0)   { setLocalErr("Introduce un importe válido"); return; }
    if (!paymentType)   { setLocalErr("Selecciona el método de pago"); return; }
    if (!paymentOption) { setLocalErr("Selecciona la modalidad de pago"); return; }
    setLocalErr(null);
    onConfirm(courseId, n, paymentType, paymentOption, durationMonths ? parseInt(durationMonths) : null, platformId || null, tutorId || null);
  }

  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white w-full sm:rounded-2xl sm:mx-4 sm:max-w-md shadow-2xl animate-slide-up flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", mode === "simulate" ? "bg-indigo-100" : "bg-emerald-100")}>
              <BookOpen className={cn("h-3.5 w-3.5", mode === "simulate" ? "text-indigo-600" : "text-emerald-600")} />
            </div>
            <p className="text-sm font-black text-slate-900">
              {mode === "simulate" ? "Simular contrato" : "Generar matrícula"}
            </p>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Alumno */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Alumno</p>
            <p className="text-sm font-black text-slate-900">{opp.contact.name}</p>
            <div className="flex flex-wrap gap-x-4 mt-0.5">
              {opp.contact.email && <span className="text-xs text-slate-500">{opp.contact.email}</span>}
              {opp.contact.phone && <span className="text-xs text-slate-500">{opp.contact.phone}</span>}
            </div>
          </div>

          {/* Curso */}
          <div>
            <label className={labelCls}>Curso *</label>
            <select
              value={courseId}
              onChange={e => {
                setCourseId(e.target.value);
                const c = courses.find(x => x.id === e.target.value);
                if (c?.price && !amount) setAmount(String(c.price));
                setLocalErr(null);
              }}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-shadow"
            >
              <option value="">— Seleccionar curso —</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.price ? ` · ${formatEur(c.price)}` : ""}</option>
              ))}
            </select>
          </div>

          {/* Importe */}
          <div>
            <label className={labelCls}>Importe final (€) *</label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="number" min="1" step="50" value={amount}
                onChange={e => { setAmount(e.target.value); setLocalErr(null); }}
                placeholder="Importe acordado"
                className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-shadow"
              />
            </div>
            {selectedCourse?.price && parseFloat(amount) !== selectedCourse.price && (
              <p className="mt-1 text-[11px] text-amber-600">Precio catálogo: {formatEur(selectedCourse.price)}</p>
            )}
          </div>

          {/* Método de pago */}
          <div>
            <label className={labelCls}>Método de pago *</label>
            <div className="grid grid-cols-2 gap-2">
              {(["contado", "financiado"] as PaymentType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setPaymentType(t); setPaymentOption(null); setLocalErr(null); }}
                  className={cn(
                    "cursor-pointer px-4 py-3 rounded-xl border text-sm font-bold transition-all",
                    paymentType === t
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {t === "contado" ? "Contado" : "Financiado"}
                </button>
              ))}
            </div>
          </div>

          {/* Modalidad */}
          {paymentType && (
            <div>
              <label className={labelCls}>
                {paymentType === "contado" ? "Forma de pago" : "Financiador"} *
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_OPTIONS[paymentType].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPaymentOption(opt.value); setLocalErr(null); }}
                    className={cn(
                      "cursor-pointer px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                      paymentOption === opt.value
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tutor */}
          {mode === "enroll" && tutors.length > 0 && (
            <div>
              <label className={labelCls}>Tutor asignado</label>
              <select
                value={tutorId}
                onChange={e => { setTutorId(e.target.value); setLocalErr(null); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-shadow"
              >
                <option value="">Sin tutor</option>
                {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          )}

          {/* Plataforma */}
          {mode === "enroll" && platforms.length > 0 && (
            <div>
              <label className={labelCls}>Plataforma</label>
              <select
                value={platformId}
                onChange={e => { setPlatformId(e.target.value); setLocalErr(null); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-shadow"
              >
                <option value="">Sin plataforma</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Duración */}
          {mode === "enroll" && (
            <div>
              <label className={labelCls}>Duración (meses)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={durationMonths}
                onChange={e => { setDurationMonths(e.target.value); setLocalErr(null); }}
                placeholder="Ej: 6"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-shadow"
              />
              <p className="mt-1.5 text-[11px] text-indigo-500">
                La matrícula correrá desde la firma del contrato. La fecha de fin se calculará automáticamente.
              </p>
            </div>
          )}

          {(localErr || error) && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {localErr ?? error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className={cn(
              "cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white disabled:opacity-50 transition-colors",
              mode === "simulate"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {mode === "simulate" ? "Generar PDF" : "Generar matrícula"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Close reason modal ────────────────────────────────────────────────────────
const CLOSE_MODAL_CONFIG = {
  lost: {
    title:      "¿Por qué se pierde este lead?",
    confirmCls: "bg-red-600 hover:bg-red-700 text-white",
    reasons:    LOST_REASONS as readonly { value: string; label: string }[],
    selectedCls:"bg-red-50 border-red-300 text-red-700",
  },
  unqualified: {
    title:      "¿Por qué no está cualificado?",
    confirmCls: "bg-slate-700 hover:bg-slate-800 text-white",
    reasons:    UNQUALIFIED_REASONS as readonly { value: string; label: string }[],
    selectedCls:"bg-slate-100 border-slate-400 text-slate-800",
  },
} as const;

function CloseReasonModal({
  mode, onConfirm, onCancel, pending, error,
}: {
  mode:      "lost" | "unqualified";
  onConfirm: (reason: string) => void;
  onCancel:  () => void;
  pending:   boolean;
  error:     string | null;
}) {
  const cfg = CLOSE_MODAL_CONFIG[mode];
  const [selected, setSelected] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-black text-slate-900">{cfg.title}</p>
          <button onClick={onCancel} className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {cfg.reasons.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setSelected(r.value); setLocalErr(null); }}
              className={cn(
                "cursor-pointer w-full text-left text-sm font-medium px-4 py-3 rounded-xl border transition-all",
                selected === r.value
                  ? cn("font-semibold", cfg.selectedCls)
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span className={cn("inline-block w-4 mr-2 text-center", selected === r.value ? "opacity-100" : "opacity-0")}>✓</span>
              {r.label}
            </button>
          ))}
        </div>
        {(localErr || error) && (
          <p className="mx-5 mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {localErr ?? error}
          </p>
        )}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!selected) { setLocalErr("Selecciona un motivo para continuar"); return; }
              onConfirm(selected);
            }}
            disabled={pending}
            className={cn("cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors", cfg.confirmCls)}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contract data modal ───────────────────────────────────────────────────────
function ContractModal({
  opp, initialDni, onSave, onCancel, pending, error,
}: {
  opp:        OppEnriched;
  initialDni: string;
  onSave:     (dni: string) => void;
  onCancel:   () => void;
  pending:    boolean;
  error:      string | null;
}) {
  const [dni, setDni] = useState(initialDni);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-sm font-black text-slate-900">Datos para el contrato</p>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Datos del contacto</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
            <span className="text-slate-400 font-medium pt-0.5">Nombre</span>
            <span className="text-slate-800 font-semibold">{opp.contact.name}</span>
            {opp.contact.phone && (
              <><span className="text-slate-400 font-medium pt-0.5">Teléfono</span><span className="text-slate-800 font-semibold">{opp.contact.phone}</span></>
            )}
            {opp.contact.email && (
              <><span className="text-slate-400 font-medium pt-0.5">Email</span><span className="text-slate-800 font-semibold">{opp.contact.email}</span></>
            )}
          </div>
          <div className="border-t border-slate-100 pt-4 mt-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">DNI / Pasaporte</label>
            <input
              type="text"
              value={dni}
              onChange={e => setDni(e.target.value.toUpperCase())}
              placeholder="12345678A"
              className="w-full text-sm font-mono border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow uppercase"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button
            onClick={() => onSave(dni)}
            disabled={pending}
            className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Enrollment success overlay ────────────────────────────────────────────────
function EnrollmentSuccess({
  number, enrollmentId, onClose, onGoToEnrollment,
}: {
  number:           number;
  enrollmentId:     string;
  onClose:          () => void;
  onGoToEnrollment: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-slide-up overflow-hidden">
        {/* Green banner */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 pt-10 pb-8 text-center">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <p className="text-xl font-black text-white leading-tight">¡Matrícula generada!</p>
          <p className="text-emerald-100 text-sm mt-1">El alumno ha sido registrado correctamente</p>
        </div>

        {/* Number + actions */}
        <div className="px-8 py-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 mb-5">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700">Matrícula</span>
            <span className="text-lg font-black text-emerald-800">#{number}</span>
          </div>

          <div className="space-y-2">
            <button
              onClick={onGoToEnrollment}
              className="cursor-pointer w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <GraduationCap className="h-4 w-4" />
              Ir a la matrícula
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer w-full text-sm font-semibold py-3 rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Volver al pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type TeamMember = { id: string; full_name: string | null; role: string };

// ── CitaModal ─────────────────────────────────────────────────────────────────
function CitaModal({
  opp, onConfirm, onCancel, pending, error,
}: {
  opp:       OppEnriched;
  onConfirm: (startISO: string, comercialId: string, comercialName: string, notes: string) => void;
  onCancel:  () => void;
  pending:   boolean;
  error:     string | null;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [date,          setDate]          = useState(todayStr);
  const [time,          setTime]          = useState("10:00");
  const [comercialId,   setComercialId]   = useState("");
  const [comercialName, setComercialName] = useState("");
  const [notes,         setNotes]         = useState("");
  const [team,          setTeam]          = useState<TeamMember[]>([]);
  const [localErr,      setLocalErr]      = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/team?role=closer").then(r => r.ok ? r.json() : []).then(setTeam).catch(() => {});
  }, []);

  function handleConfirm() {
    if (!date)        { setLocalErr("Selecciona una fecha"); return; }
    if (!time)        { setLocalErr("Selecciona una hora");  return; }
    if (!comercialId) { setLocalErr("Selecciona la comercial asignada"); return; }
    setLocalErr(null);
    const startISO = new Date(`${date}T${time}:00`).toISOString();
    onConfirm(startISO, comercialId, comercialName, notes.trim());
  }

  const fieldCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow bg-white";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white w-full sm:rounded-2xl sm:mx-4 sm:max-w-md shadow-2xl animate-slide-up flex flex-col max-h-[92dvh]">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Agendar cita</p>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">{opp.contact.name}</p>
            </div>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={e => { setDate(e.target.value); setLocalErr(null); }}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Hora de inicio</label>
              <input
                type="time"
                value={time}
                onChange={e => { setTime(e.target.value); setLocalErr(null); }}
                className={fieldCls}
              />
            </div>
          </div>

          {/* Comercial */}
          <div>
            <label className={labelCls}>Comercial asignada *</label>
            <select
              value={comercialId}
              onChange={e => {
                setComercialId(e.target.value);
                const m = team.find(x => x.id === e.target.value);
                setComercialName(m?.full_name ?? "");
                setLocalErr(null);
              }}
              className={fieldCls}
            >
              <option value="">— Seleccionar comercial —</option>
              {team.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.id}
                  {m.role === "administracion" ? " (Admin)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Comentarios de la cita</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contexto, objetivos, lo que hay que trabajar en la cita..."
              className={cn(fieldCls, "resize-none")}
            />
          </div>

          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700">
            <span className="font-semibold">Duración:</span> 1 hora · La etapa pasará automáticamente a "Cita agendada"
          </div>

          {(localErr || error) && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {localErr ?? error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Confirmar cita
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AssignMemberModal ─────────────────────────────────────────────────────────
function AssignMemberModal({
  role, onSave, onCancel, pending, error,
}: {
  role:     "setter" | "closer";
  onSave:   (id: string, name: string) => void;
  onCancel: () => void;
  pending:  boolean;
  error:    string | null;
}) {
  const [members,    setMembers]    = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetch("/api/team")
      .then(r => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => {});
  }, [role]);

  const selected = members.find(m => m.id === selectedId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-sm font-black text-slate-900">
              Asignar {role === "setter" ? "setter" : "closer"}
            </p>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {members.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Cargando…</p>
          ) : (
            members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                className={cn(
                  "cursor-pointer w-full text-left text-sm font-medium px-4 py-3 rounded-xl border transition-all flex items-center gap-3",
                  selectedId === m.id
                    ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                  {(m.full_name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="truncate">{m.full_name ?? m.id}</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    m.role === "setter"        ? "text-sky-500" :
                    m.role === "closer"        ? "text-violet-500" :
                    m.role === "administracion"? "text-indigo-500" :
                                                 "text-slate-400"
                  )}>
                    {m.role === "administracion" ? "Admin" : m.role}
                  </span>
                </div>
              </button>
            ))
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => selected && onSave(selected.id, selected.full_name ?? selected.id)}
            disabled={pending || !selectedId}
            className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditContactModal ──────────────────────────────────────────────────────────
function EditContactModal({
  initial, onSave, onCancel, pending, error,
}: {
  initial: { name: string; email: string; phone: string };
  onSave:  (data: { name: string; email: string; phone: string }) => void;
  onCancel: () => void;
  pending:  boolean;
  error:    string | null;
}) {
  const [name,  setName]  = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);

  const fieldCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow placeholder:text-slate-300";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Pencil className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-sm font-black text-slate-900">Editar datos de contacto</p>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Nombre completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre Apellido" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000" className={fieldCls} />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ name: name.trim(), email: email.trim(), phone: phone.trim() })}
            disabled={pending || !name.trim()}
            className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LeadSheet ─────────────────────────────────────────────────────────────────
type ModalMode = "lost" | "unqualified" | "contract" | "ficha" | "enrollment" | "cita" | "simulate" | "editContact" | "assignSetter" | "assignCloser";

function findStageId(stages: GhlPipelineStage[], keyword: string): string | undefined {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const k = norm(keyword);
  return stages.find(s => norm(s.name).includes(k) || k.includes(norm(s.name)))?.id;
}

// Returns true if opp's current stage comes BEFORE "Cita agendada" in the pipeline
// (i.e. setter prospection stages where enrollment is not yet possible)
function isProspectionStage(opp: OppEnriched, stages: GhlPipelineStage[]): boolean {
  if (!stages.length) return false;
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const citaStage = stages.find(s => {
    const n = norm(s.name);
    return n.includes("cita") && n.includes("agendada");
  });
  if (!citaStage) return false;
  const currentStage = stages.find(s => s.id === opp.pipelineStageId);
  if (!currentStage) return false;
  return currentStage.position < citaStage.position;
}

function getEnrollmentErrors(opp: OppEnriched, profile: Partial<LeadProfile>): string[] {
  const errors: string[] = [];
  const parts = opp.contact.name.trim().split(/\s+/);
  if (parts.length < 2 || parts[1].length < 1) errors.push("apellido (el nombre solo tiene una palabra)");
  if (!opp.contact.phone?.trim())  errors.push("teléfono");
  if (!opp.contact.email?.trim())  errors.push("email");
  if (!profile.dni?.trim())        errors.push("DNI / NIE (rellénalo en Datos contrato)");
  return errors;
}

export function LeadSheet({
  opp, onClose, onAction, stages = [], currentUser,
}: {
  opp:         OppEnriched;
  onClose:     () => void;
  onAction?:  () => void;
  stages?:     GhlPipelineStage[];
  currentUser: { id: string; role: string };
}) {
  const lostStageId        = findStageId(stages, "perdido");
  const unqualifiedStageId = findStageId(stages, "cualificado");
  const citaStageId        = findStageId(stages, "cita agendada");
  const matriculadoStageId = findStageId(stages, "matriculado");
  const router = useRouter();
  const [activity,   setActivity]   = useState<LeadNote[]>([]);
  const [actLoading, setActLoading] = useState(true);
  const [profile,    setProfile]    = useState<Partial<LeadProfile>>({});
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [platforms,  setPlatforms]  = useState<Platform[]>([]);
  const [tutors,     setTutors]     = useState<Tutor[]>([]);

  const [noteType,     setNoteType]     = useState<NoteType>("nota");
  const [content,      setContent]      = useState("");
  const [formErr,      setFormErr]      = useState<string | null>(null);
  const [pending,      startNote]       = useTransition();
  const [attaching,        setAttaching]        = useState(false);
  const [showAttachments,  setShowAttachments]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modal,              setModal]             = useState<ModalMode | null>(null);
  const [closeErr,           setCloseErr]           = useState<string | null>(null);
  const [closePending,       startClose]            = useTransition();
  const [contractErr,        setContractErr]        = useState<string | null>(null);
  const [contractPending,    startContract]         = useTransition();
  const [fichaErr,           setFichaErr]           = useState<string | null>(null);
  const [fichaPending,       startFicha]            = useTransition();
  const [enrollErr,          setEnrollErr]          = useState<string | null>(null);
  const [enrollPending,      startEnroll]           = useTransition();
  const [enrollNumber,       setEnrollNumber]       = useState<number | null>(null);
  const [enrollId,           setEnrollId]           = useState<string | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<{ id: string; number: number; studentId: string } | null>(null);
  const [citaErr,            setCitaErr]            = useState<string | null>(null);
  const [citaPending,        startCita]             = useTransition();
  const [simulateErr,        setSimulateErr]        = useState<string | null>(null);
  const [simulatePending,    setSimulatePending]    = useState(false);
  const [editContactErr,     setEditContactErr]     = useState<string | null>(null);
  const [editContactPending, startEditContact]      = useTransition();
  // Local override so edits are reflected immediately without waiting for a parent refresh
  const [contactOverride, setContactOverride] = useState<{ name: string; email: string | null; phone: string | null } | null>(null);
  const contact = contactOverride ?? opp.contact;

  // Assignment state (local optimistic update)
  const [assignErr,     setAssignErr]     = useState<string | null>(null);
  const [assignPending, startAssign]      = useTransition();
  const [setterOverride, setSetterOverride] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [closerOverride, setCloserOverride] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const setterName = setterOverride !== undefined ? setterOverride?.name : (opp.setter_name ?? null);
  const closerName = closerOverride !== undefined ? closerOverride?.name : (opp.closer_name ?? null);

  // ── Fetchers ──
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${opp.contact.id}/activity`);
      if (res.ok) setActivity(await res.json());
    } finally { setActLoading(false); }
  }, [opp.contact.id]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${opp.contact.id}/profile`);
      if (res.ok) setProfile(await res.json());
    } catch {}
  }, [opp.contact.id]);

  const fetchEnrollmentStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${opp.contact.id}/enrollment-status?oppId=${opp.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.enrolled) {
        setExistingEnrollment({ id: data.enrollmentId, number: data.enrollmentNumber, studentId: data.studentId });
      } else {
        setExistingEnrollment(null);
      }
    } catch {}
  }, [opp.contact.id, opp.id]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) setCourses(await res.json());
    } catch {}
  }, []);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch("/api/platforms");
      if (res.ok) setPlatforms(await res.json());
    } catch {}
  }, []);

  const fetchTutors = useCallback(async () => {
    try {
      const res = await fetch("/api/tutors");
      if (res.ok) setTutors(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchActivity();
    fetchProfile();
    fetchCourses();
    fetchPlatforms();
    fetchTutors();
    fetchEnrollmentStatus();
  }, [fetchActivity, fetchProfile, fetchCourses, fetchPlatforms, fetchTutors, fetchEnrollmentStatus]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { if (modal) setModal(null); else onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal, onClose]);

  // ── Handlers ──
  function handleCloseConfirm(reason: string) {
    setCloseErr(null);
    startClose(async () => {
      const res = modal === "lost"
        ? await markLeadAsLost(opp.id, opp.contact.id, reason as LostReason, lostStageId)
        : await markLeadAsUnqualified(opp.id, opp.contact.id, reason as UnqualifiedReason, unqualifiedStageId);
      if (res.error) { setCloseErr(res.error); return; }
      onAction?.(); onClose();
    });
  }

  function handleSaveContract(dni: string) {
    setContractErr(null);
    startContract(async () => {
      const res = await upsertLeadProfile(opp.contact.id, { dni }, undefined, `🪪 DNI / NIE actualizado: ${dni}`);
      if (res.error) { setContractErr(res.error); return; }
      await fetchProfile();
      setModal(null);
      toast.success("DNI guardado");
    });
  }

  function handleSaveFicha(data: FichaFormData) {
    setFichaErr(null);
    startFicha(async () => {
      const importe = data.importe_previsto ? parseFloat(data.importe_previsto) : null;
      const tempLabel = data.temperatura === "caliente" ? "🔥 Caliente" : data.temperatura === "templada" ? "🌡️ Templada" : data.temperatura === "fria" ? "❄️ Fría" : null;
      const lines: string[] = ["📋 Ficha de cualificación guardada"];
      if (tempLabel)             lines.push(`Temperatura: ${tempLabel}`);
      if (data.objetivo?.trim()) lines.push(`Objetivo: ${data.objetivo.trim()}`);
      if (importe)               lines.push(`Importe previsto: ${importe.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`);
      const res = await upsertLeadProfile(
        opp.contact.id,
        { ...data, importe_previsto: importe, curso_interes_id: data.curso_interes_id },
        opp.id,
        lines.join("\n"),
      );
      if (res.error) { setFichaErr(res.error); return; }
      // Re-fetch from DB so the sheet shows exact saved state
      await fetchProfile();
      setModal(null);
      toast.success("Ficha guardada");
      // Refresh kanban card (updates monetary value)
      onAction?.();
    });
  }

  function handleGenerateEnrollment(
    courseId: string,
    amount: number,
    paymentType: PaymentType,
    paymentOption: PaymentOption,
    durationMonths: number | null,
    platformId: string | null,
    tutorId: string | null,
  ) {
    setEnrollErr(null);
    startEnroll(async () => {
      const res = await generateEnrollment(
        opp.id,
        opp.contact.id,
        { name: opp.contact.name, email: opp.contact.email ?? "", phone: opp.contact.phone },
        profile.dni ?? null,
        courseId,
        amount,
        paymentType,
        paymentOption,
        matriculadoStageId,
        durationMonths,
        platformId,
        tutorId,
      );
      if ("error" in res) { setEnrollErr(res.error); return; }
      setEnrollNumber(res.enrollmentNumber);
      setEnrollId(res.enrollmentId);
      setExistingEnrollment({ id: res.enrollmentId, number: res.enrollmentNumber, studentId: "" });
      setModal(null);
    });
  }

  function handleSaveContact(data: { name: string; email: string; phone: string }) {
    setEditContactErr(null);
    startEditContact(async () => {
      const res = await updateLeadContactInfo(
        opp.contact.id,
        opp.id,
        { name: data.name, email: data.email, phone: data.phone },
        { name: contact.name, email: contact.email, phone: contact.phone },
      );
      if ("error" in res) { setEditContactErr(res.error); return; }
      setContactOverride({ name: data.name, email: data.email || null, phone: data.phone || null });
      setModal(null);
      toast.success("Datos actualizados");
      setActLoading(true);
      await fetchActivity();
      onAction?.();
    });
  }

  function handleAssignMember(role: "setter" | "closer", memberId: string, memberName: string) {
    setAssignErr(null);
    startAssign(async () => {
      const res = await assignLeadMember(opp.contact.id, opp.id, role, memberId, memberName);
      if ("error" in res) { setAssignErr(res.error); return; }
      if (role === "setter") setSetterOverride({ id: memberId, name: memberName });
      else                   setCloserOverride({ id: memberId, name: memberName });
      setModal(null);
      toast.success(`${role === "setter" ? "Setter" : "Closer"} asignado: ${memberName}`);
      onAction?.();
    });
  }

  function handleCitaConfirm(startISO: string, comercialId: string, comercialName: string, notes: string) {
    setCitaErr(null);
    startCita(async () => {
      const res = await scheduleAppointment(
        opp.id, opp.contact.id, opp.contact.name, opp.contact.phone,
        startISO, comercialId, comercialName, notes, citaStageId,
      );
      if ("error" in res) { setCitaErr(res.error); return; }
      toast.success("Cita agendada correctamente");
      setModal(null);
      setActLoading(true);
      await fetchActivity();
      onAction?.();
    });
  }

  async function handleSimulateContract(
    courseId: string,
    amount: number,
    paymentType: PaymentType,
    paymentOption: PaymentOption,
    _durationMonths: number | null,
    _platformId: string | null,
    _tutorId: string | null,
  ) {
    setSimulateErr(null);
    setSimulatePending(true);
    try {
      const res = await fetch("/api/leads/preview-contract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId:     opp.contact.id,
          name:          opp.contact.name,
          email:         opp.contact.email ?? "",
          phone:         opp.contact.phone ?? null,
          courseId,
          amount,
          paymentType,
          paymentOption,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al generar el PDF" }));
        setSimulateErr(err.error ?? "Error al generar el PDF");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setModal(null);
    } catch {
      setSimulateErr("Error al generar el PDF");
    } finally {
      setSimulatePending(false);
    }
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;
    setAttaching(true);
    for (const file of picked) {
      const fd = new FormData();
      fd.append("contactId", opp.contact.id);
      fd.append("oppId",     opp.id);
      fd.append("type",      "nota");
      fd.append("content",   "");
      fd.append("files",     file);
      const res = await createLeadActivity(fd);
      if (res.error) toast.error(`Error al adjuntar ${file.name}: ${res.error}`);
      else           toast.success(`✓ ${file.name} adjuntado`);
    }
    setAttaching(false);
    setActLoading(true);
    await fetchActivity();
  }

  function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setFormErr("Escribe algo para guardar"); return; }
    setFormErr(null);
    const fd = new FormData();
    fd.append("contactId", opp.contact.id);
    fd.append("oppId",     opp.id);
    fd.append("type",      noteType);
    fd.append("content",   content.trim());
    startNote(async () => {
      const res = await createLeadActivity(fd);
      if (res.error) { setFormErr(res.error); return; }
      setContent(""); setActLoading(true);
      await fetchActivity();
    });
  }

  const interestCourse = courses.find(c => c.id === profile.curso_interes_id);

  const stageCls = {
    setter: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
    closer: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
    other:  "bg-slate-100 text-slate-600",
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[50vw] min-w-[340px] bg-white shadow-2xl animate-slide-in-right" style={{ isolation: "isolate" }}>

        {/* ── Modals (fixed z-[60], above the sheet) ── */}
        {(modal === "lost" || modal === "unqualified") && (
          <CloseReasonModal
            mode={modal}
            pending={closePending}
            error={closeErr}
            onConfirm={handleCloseConfirm}
            onCancel={() => { setModal(null); setCloseErr(null); }}
          />
        )}
        {modal === "contract" && (
          <ContractModal
            opp={opp}
            initialDni={profile.dni ?? ""}
            pending={contractPending}
            error={contractErr}
            onSave={handleSaveContract}
            onCancel={() => { setModal(null); setContractErr(null); }}
          />
        )}
        {modal === "ficha" && (
          <FichaModal
            opp={opp}
            initial={profile}
            courses={courses}
            pending={fichaPending}
            error={fichaErr}
            onSave={handleSaveFicha}
            onCancel={() => { setModal(null); setFichaErr(null); }}
          />
        )}
        {modal === "enrollment" && (
          <EnrollmentModal
            opp={opp}
            courses={courses}
            platforms={platforms}
            tutors={tutors}
            initialCourseId={profile.curso_interes_id ?? null}
            initialAmount={profile.importe_previsto ?? null}
            pending={enrollPending}
            error={enrollErr}
            onConfirm={handleGenerateEnrollment}
            onCancel={() => { setModal(null); setEnrollErr(null); }}
          />
        )}
        {modal === "cita" && (
          <CitaModal
            opp={opp}
            pending={citaPending}
            error={citaErr}
            onConfirm={handleCitaConfirm}
            onCancel={() => { setModal(null); setCitaErr(null); }}
          />
        )}
        {modal === "editContact" && (
          <EditContactModal
            initial={{ name: contact.name, email: contact.email ?? "", phone: contact.phone ?? "" }}
            pending={editContactPending}
            error={editContactErr}
            onSave={handleSaveContact}
            onCancel={() => { setModal(null); setEditContactErr(null); }}
          />
        )}
        {(modal === "assignSetter" || modal === "assignCloser") && (
          <AssignMemberModal
            role={modal === "assignSetter" ? "setter" : "closer"}
            pending={assignPending}
            error={assignErr}
            onSave={(id, name) => handleAssignMember(modal === "assignSetter" ? "setter" : "closer", id, name)}
            onCancel={() => { setModal(null); setAssignErr(null); }}
          />
        )}
        {modal === "simulate" && (
          <EnrollmentModal
            opp={opp}
            courses={courses}
            platforms={platforms}
            tutors={tutors}
            initialCourseId={profile.curso_interes_id ?? null}
            initialAmount={profile.importe_previsto ?? null}
            pending={simulatePending}
            error={simulateErr}
            mode="simulate"
            onConfirm={handleSimulateContract}
            onCancel={() => { setModal(null); setSimulateErr(null); }}
          />
        )}
        {enrollNumber !== null && enrollId !== null && (
          <EnrollmentSuccess
            number={enrollNumber}
            enrollmentId={enrollId}
            onClose={() => {
              setEnrollNumber(null);
              setEnrollId(null);
              onAction?.();
              onClose();
            }}
            onGoToEnrollment={() => {
              const id = enrollId;
              setEnrollNumber(null);
              setEnrollId(null);
              onAction?.();
              onClose();
              router.push(`/enrollments/${id}`);
            }}
          />
        )}

        {/* ── Header — fijo, siempre visible ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
              {contact.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 text-sm leading-tight truncate">{contact.name}</p>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block", stageCls[opp.zone])}>
                {opp.pipelineStageName}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Todo lo de abajo del header es scrollable ── */}
        <div className="flex-1 overflow-y-auto">

        {/* ── Temperatura — banner prominente ── */}
        {profile.temperatura && (
          <div className={cn(
            "px-5 py-3 flex items-center justify-between border-b",
            profile.temperatura === "caliente" ? "bg-red-50 border-red-200" :
            profile.temperatura === "templada" ? "bg-amber-50 border-amber-200" :
                                                  "bg-sky-50 border-sky-200"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center",
                profile.temperatura === "caliente" ? "bg-red-100 text-red-600" :
                profile.temperatura === "templada" ? "bg-amber-100 text-amber-600" :
                                                      "bg-sky-100 text-sky-600"
              )}>
                <TemperaturaIcon t={profile.temperatura} />
              </div>
              <div>
                <p className={cn(
                  "text-xs font-black uppercase tracking-widest",
                  profile.temperatura === "caliente" ? "text-red-700" :
                  profile.temperatura === "templada" ? "text-amber-700" : "text-sky-700"
                )}>
                  Temperatura del lead
                </p>
                <TempBadge t={profile.temperatura} />
              </div>
            </div>
            {profile.frase_clave && (
              <p className="text-xs italic text-slate-500 max-w-[180px] text-right line-clamp-2">
                "{profile.frase_clave}"
              </p>
            )}
          </div>
        )}

        {/* ── Curso + importe — destacado ── */}
        {interestCourse && (
          <div className="mx-5 mt-3 mb-1 shrink-0 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Curso de interés</p>
                <p className="text-sm font-black text-emerald-900 truncate">{interestCourse.name}</p>
              </div>
            </div>
            {profile.importe_previsto != null && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Importe</p>
                <p className="text-xl font-black text-emerald-700">{formatEur(profile.importe_previsto)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Contact info ── */}
        <div className="px-5 py-3 border-b border-slate-100 space-y-1">
          <div className="flex items-center justify-between mb-0.5">
            <div className="space-y-1 flex-1 min-w-0">
              {contact.email ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />{contact.email}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <Mail className="h-3.5 w-3.5 shrink-0" />Sin email
                </div>
              )}
              {contact.phone ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />{contact.phone}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <Phone className="h-3.5 w-3.5 shrink-0" />Sin teléfono
                </div>
              )}
            </div>
            <button
              onClick={() => { setEditContactErr(null); setModal("editContact"); }}
              className="cursor-pointer shrink-0 ml-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          </div>
          {/* Setter / Closer assignment */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Setter:</span>
              {setterName ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 rounded-full px-2.5 py-0.5">
                  {setterName}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Sin asignar</span>
              )}
              {currentUser.role === "administracion" && (
                <button
                  onClick={() => { setAssignErr(null); setModal("assignSetter"); }}
                  className="cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-colors"
                >
                  {setterName ? "Cambiar" : "Asignar"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Closer:</span>
              {closerName ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60 rounded-full px-2.5 py-0.5">
                  {closerName}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Sin asignar</span>
              )}
              {(currentUser.role === "setter" || currentUser.role === "administracion") && (
                <button
                  onClick={() => { setAssignErr(null); setModal("assignCloser"); }}
                  className="cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                >
                  {closerName ? "Cambiar" : "Asignar"}
                </button>
              )}
            </div>
          </div>

          {profile.dni && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-mono font-semibold">{profile.dni}</span>
            </div>
          )}
          {opp.cursoValue && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />{opp.cursoValue}
            </div>
          )}
          {profile.objetivo && (
            <div className="mt-1 text-xs text-slate-500 italic line-clamp-2">
              "{profile.objetivo}"
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        {(() => {
          const inProspection = isProspectionStage(opp, stages);
          const missing       = inProspection ? [] : getEnrollmentErrors(opp, profile);
          const canEnroll     = !inProspection && missing.length === 0;

          return (
            <div className="px-5 py-3 border-b border-slate-100 space-y-2">
              <div className="flex gap-2 flex-wrap">
                {/* Matricular */}
                {existingEnrollment ? (
                  <button
                    onClick={() => router.push(`/enrollments/${existingEnrollment.id}`)}
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl border border-indigo-200 hover:border-indigo-300 transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Ver matrícula #{existingEnrollment.number}
                  </button>
                ) : canEnroll ? (
                  <button
                    onClick={() => { setEnrollErr(null); setModal("enrollment"); }}
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200 hover:border-emerald-300 transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Generar matrícula
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 cursor-not-allowed select-none">
                    <BookOpen className="h-3.5 w-3.5" />
                    Generar matrícula
                  </div>
                )}

                <button
                  onClick={() => { setModal("ficha"); setFichaErr(null); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-xl border border-teal-200 hover:border-teal-300 transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Ficha de cualificación
                  {profile.temperatura && (
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full inline-block ml-0.5",
                      profile.temperatura === "caliente" ? "bg-red-500" : profile.temperatura === "templada" ? "bg-amber-400" : "bg-sky-500"
                    )} />
                  )}
                </button>

                <button
                  onClick={() => { setModal("contract"); setContractErr(null); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl border border-indigo-200 hover:border-indigo-300 transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Datos contrato
                  {profile.dni && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                </button>

                <button
                  onClick={() => { setModal("cita"); setCitaErr(null); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl border border-indigo-200 hover:border-indigo-300 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Agendar cita
                </button>

                <button
                  onClick={() => { setSimulateErr(null); setModal("simulate"); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl border border-violet-200 hover:border-violet-300 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Simular contrato
                </button>

                <button
                  onClick={() => { setModal("lost"); setCloseErr(null); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl border border-red-200 hover:border-red-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Perdido
                </button>

                <button
                  onClick={() => { setModal("unqualified"); setCloseErr(null); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  No cualificado
                </button>
              </div>

              {/* Motivo bloqueo visible */}
              {existingEnrollment && (
                <div className="flex items-start gap-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <GraduationCap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Este alumno ya tiene la matrícula <span className="font-bold">#{existingEnrollment.number}</span>.
                    Para matricularlo en otro curso, ve a{" "}
                    <button
                      onClick={() => router.push("/students")}
                      className="cursor-pointer underline font-bold hover:text-indigo-900"
                    >
                      Alumnos
                    </button>
                    {" "}y crea una nueva matrícula desde su ficha.
                  </span>
                </div>
              )}
              {!existingEnrollment && inProspection && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  El lead está en prospección. Muévelo a "Cita agendada" o posterior para matricular.
                </p>
              )}
              {!existingEnrollment && !inProspection && missing.length > 0 && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                  <span className="font-bold">Faltan datos:</span> {missing.join(" · ")}
                </p>
              )}
            </div>
          );
        })()}


        {/* ── Nueva actividad ── */}
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Nueva actividad</p>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {NOTE_TYPES.map(t => {
              const def = TYPE_DEF[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNoteType(t)}
                  className={cn(
                    "cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-all",
                    noteType === t ? cn("border-transparent", def.badge) : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                  )}
                >
                  <def.Icon className="h-3 w-3" />
                  {def.label}
                </button>
              );
            })}
          </div>
          <form onSubmit={handleSubmitNote}>
            <textarea
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Escribe una nota, resumen de llamada, mensaje..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow"
            />
            {formErr && <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formErr}</p>}
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attaching}
                className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                {attaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                {attaching ? "Subiendo…" : "Adjuntar"}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilePick} />
              {(() => {
                const allAtts = activity.flatMap(n => n.attachments);
                return (
                  <button
                    type="button"
                    onClick={() => setShowAttachments(v => !v)}
                    className={cn(
                      "cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors",
                      showAttachments
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Ver adjuntos
                    {allAtts.length > 0 && (
                      <span className="ml-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-px leading-none">
                        {allAtts.length}
                      </span>
                    )}
                  </button>
                );
              })()}
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Guardar
              </button>
            </div>
          </form>

          {/* ── Panel adjuntos ── */}
          {showAttachments && (() => {
            const allAtts = activity.flatMap(n => n.attachments);
            return (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500 border-b border-indigo-100">
                  Adjuntos · {allAtts.length}
                </p>
                {allAtts.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-400 text-center">Sin adjuntos todavía</p>
                ) : (
                  <ul className="divide-y divide-indigo-100">
                    {allAtts.map(att => (
                      <li key={att.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 transition-colors">
                        <Paperclip className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="flex-1 min-w-0 text-xs text-slate-700 truncate">{att.file_name}</span>
                        {att.file_size && (
                          <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(att.file_size)}</span>
                        )}
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Ver
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Actividad ── */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
            Actividad · {activity.length} registros
          </p>
          {actLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : activity.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-xs font-semibold text-slate-400">Sin actividad registrada aún</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-4">
                {activity.map(note => {
                  const def = TYPE_DEF[note.type];
                  return (
                    <div key={note.id} className="flex gap-3 relative">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10", def.color)}>
                        <def.Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-100 px-3.5 py-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", def.badge)}>{def.label}</span>
                          {note.created_by_name && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <User className="h-2.5 w-2.5" />{note.created_by_name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 ml-auto">{formatDateTime(note.created_at)}</span>
                        </div>
                        {note.content && <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>}
                        {note.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {note.attachments.map(att => (
                              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[11px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors">
                                <Download className="h-3 w-3 shrink-0" />
                                <span className="truncate flex-1">{att.file_name}</span>
                                {att.file_size && <span className="text-indigo-400 shrink-0">{formatBytes(att.file_size)}</span>}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        </div>{/* end scrollable body */}
      </div>
    </>
  );
}
