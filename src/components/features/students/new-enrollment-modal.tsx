"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, BookMarked, CheckCircle2, ArrowRight, Info, Layers } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createEnrollmentFromStudent } from "@/app/(app)/students/[id]/actions";

type Course    = { id: string; name: string; price: number | null };
type Platform  = { id: string; name: string };
type Tutor     = { id: string; full_name: string };
type FormationCourseEntry = { course_id: string; position: number; courses: { id: string; name: string } | null };
type Formation = { id: string; name: string; formation_courses: FormationCourseEntry[] };

type PaymentType   = "contado" | "financiado";
type PaymentOption = "efectivo" | "transferencia" | "sabadell" | "sequra" | "esmera";
type EnrollTab     = "course" | "formation";

const PAYMENT_OPTIONS: Record<PaymentType, { value: PaymentOption; label: string }[]> = {
  contado:    [
    { value: "efectivo",      label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
  ],
  financiado: [
    { value: "sabadell", label: "Sabadell" },
    { value: "sequra",   label: "SeQura" },
    { value: "esmera",   label: "Esmera" },
  ],
};

export function NewEnrollmentModal({
  studentId,
  studentName,
  courses,
  platforms,
  tutors,
  formations = [],
  onClose,
}: {
  studentId:   string;
  studentName: string;
  courses:     Course[];
  platforms:   Platform[];
  tutors:      Tutor[];
  formations?: Formation[];
  onClose:     () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab,            setTab]           = useState<EnrollTab>("course");
  const [courseId,       setCourseId]      = useState("");
  const [formationId,    setFormationId]   = useState("");
  const [courseTutors,   setCourseTutors]  = useState<Record<string, string>>({});
  const [amount,         setAmount]        = useState("");
  const [paymentType,    setPaymentType]   = useState<PaymentType>("contado");
  const [paymentOption,  setPaymentOption] = useState<PaymentOption>("efectivo");
  const [durationMonths, setDurationMonths] = useState("");
  const [platformId,     setPlatformId]    = useState(() => platforms[0]?.id ?? "");
  const [tutorId,        setTutorId]       = useState(() => tutors.length === 1 ? tutors[0].id : "");
  const [enrollNumber,   setEnrollNumber]  = useState<number | null>(null);
  const [enrollId,       setEnrollId]      = useState<string | null>(null);

  const selectedFormation = formations.find(f => f.id === formationId) ?? null;
  const formationCourses  = selectedFormation
    ? [...selectedFormation.formation_courses].sort((a, b) => a.position - b.position)
    : [];

  function handlePaymentTypeChange(t: PaymentType) {
    setPaymentType(t);
    setPaymentOption(PAYMENT_OPTIONS[t][0].value);
  }

  function handleCourseChange(id: string) {
    setCourseId(id);
    const course = courses.find(c => c.id === id);
    if (course?.price) setAmount(course.price.toString());
  }

  function handleFormationChange(id: string) {
    setFormationId(id);
    setCourseTutors({});
  }

  function handleCourseTutorChange(cid: string, tid: string) {
    setCourseTutors(prev => ({ ...prev, [cid]: tid }));
  }

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (tab === "course"    && !courseId)    { toast.error("Selecciona un curso"); return; }
    if (tab === "formation" && !formationId) { toast.error("Selecciona una formación"); return; }
    if (!amt || amt <= 0) { toast.error("El importe debe ser mayor que 0"); return; }

    startTransition(async () => {
      const dur = durationMonths ? parseInt(durationMonths) : null;
      const res = await createEnrollmentFromStudent(
        studentId,
        tab === "course" ? courseId : null,
        amt,
        paymentType,
        paymentOption,
        dur,
        platformId || null,
        tab === "course" ? (tutorId || null) : null,
        tab === "formation" ? formationId : null,
        tab === "formation" ? courseTutors : null,
      );
      if ("error" in res) { toast.error(res.error); return; }
      setEnrollNumber(res.enrollmentNumber);
      setEnrollId(res.enrollmentId);
    });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

  // Success screen
  if (enrollNumber !== null && enrollId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">¡Matrícula generada!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Matrícula <span className="font-bold text-slate-800">#{enrollNumber}</span> creada para {studentName}.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push(`/enrollments/${enrollId}`)}
              className="cursor-pointer w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Ir a la matrícula
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => { router.refresh(); onClose(); }}
              className="cursor-pointer w-full text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-2"
            >
              Volver al alumno
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-500" />
            <div>
              <h2 className="text-base font-black text-slate-900">Nueva matrícula</h2>
              <p className="text-xs text-slate-500">{studentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Tab toggle — only show if formations exist */}
          {formations.length > 0 && (
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setTab("course")}
                className={cn(
                  "cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors",
                  tab === "course"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <BookMarked className="h-3.5 w-3.5" />
                Curso individual
              </button>
              <button
                type="button"
                onClick={() => setTab("formation")}
                className={cn(
                  "cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors",
                  tab === "formation"
                    ? "bg-violet-600 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Formación
              </button>
            </div>
          )}

          {/* Course selector */}
          {tab === "course" && (
            <div>
              <label className={labelCls}>Curso</label>
              <select value={courseId} onChange={e => handleCourseChange(e.target.value)} className={inputCls}>
                <option value="">Selecciona un curso…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Formation selector */}
          {tab === "formation" && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Formación</label>
                <select value={formationId} onChange={e => handleFormationChange(e.target.value)} className={inputCls}>
                  <option value="">Selecciona una formación…</option>
                  {formations.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              {formationCourses.length > 0 && tutors.length > 0 && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-violet-700 mb-1">Tutor por curso</p>
                  {formationCourses.map((fc, i) => {
                    const courseName = fc.courses?.name ?? fc.course_id;
                    return (
                      <div key={fc.course_id} className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-violet-200 text-violet-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs text-slate-700 font-medium flex-1 truncate">{courseName}</span>
                        <select
                          value={courseTutors[fc.course_id] ?? ""}
                          onChange={e => handleCourseTutorChange(fc.course_id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 max-w-[140px]"
                        >
                          <option value="">Sin tutor</option>
                          {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className={labelCls}>Importe (€)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>

          {/* Payment type */}
          <div>
            <label className={labelCls}>Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {(["contado", "financiado"] as PaymentType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handlePaymentTypeChange(t)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors capitalize",
                    paymentType === t
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Payment option */}
          <div>
            <label className={labelCls}>
              {paymentType === "contado" ? "Método" : "Financiadora"}
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS[paymentType].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentOption(opt.value)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                    paymentOption === opt.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tutor — only for individual course */}
          {tab === "course" && tutors.length > 0 && (
            <div>
              <label className={labelCls}>Tutor asignado</label>
              <select value={tutorId} onChange={e => setTutorId(e.target.value)} className={inputCls}>
                <option value="">Sin tutor</option>
                {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          )}

          {/* Platform */}
          {platforms.length > 0 && (
            <div>
              <label className={labelCls}>Plataforma</label>
              <select value={platformId} onChange={e => setPlatformId(e.target.value)} className={inputCls}>
                <option value="">Sin plataforma</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className={labelCls}>Duración (meses)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={durationMonths}
              onChange={e => setDurationMonths(e.target.value)}
              placeholder="Ej: 6"
              className={inputCls}
            />
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
              <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-600">
                La matrícula correrá desde que se firme el contrato. La fecha de fin se calculará automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              "cursor-pointer flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors",
              tab === "formation" ? "bg-violet-600 hover:bg-violet-700" : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            <BookMarked className="h-4 w-4" />
            {isPending ? "Generando…" : "Generar matrícula"}
          </button>
        </div>
      </div>
    </div>
  );
}
