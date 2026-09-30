"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, BookMarked, CheckCircle2, ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createEnrollmentFromStudent } from "@/app/(app)/students/[id]/actions";

type Course    = { id: string; name: string; price: number | null };
type Platform  = { id: string; name: string };
type Tutor     = { id: string; full_name: string };

type PaymentType   = "contado" | "financiado";
type PaymentOption = "efectivo" | "transferencia" | "sabadell" | "sequra" | "esmera";

const PAYMENT_OPTIONS: Record<PaymentType, { value: PaymentOption; label: string }[]> = {
  contado:    [
    { value: "efectivo",     label: "Efectivo" },
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
  onClose,
}: {
  studentId:   string;
  studentName: string;
  courses:     Course[];
  platforms:   Platform[];
  tutors:      Tutor[];
  onClose:     () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [courseId,       setCourseId]       = useState("");
  const [amount,         setAmount]         = useState("");
  const [paymentType,    setPaymentType]    = useState<PaymentType>("contado");
  const [paymentOption,  setPaymentOption]  = useState<PaymentOption>("efectivo");
  const [durationMonths, setDurationMonths] = useState("");
  const [platformId,     setPlatformId]     = useState(() => platforms[0]?.id ?? "");
  const [tutorId,        setTutorId]        = useState(() => tutors.length === 1 ? tutors[0].id : "");
  const [enrollNumber,   setEnrollNumber]   = useState<number | null>(null);
  const [enrollId,       setEnrollId]       = useState<string | null>(null);

  function handlePaymentTypeChange(t: PaymentType) {
    setPaymentType(t);
    setPaymentOption(PAYMENT_OPTIONS[t][0].value);
  }

  function handleCourseChange(id: string) {
    setCourseId(id);
    const course = courses.find(c => c.id === id);
    if (course?.price) setAmount(course.price.toString());
  }

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!courseId)           { toast.error("Selecciona un curso"); return; }
    if (!amt || amt <= 0)    { toast.error("El importe debe ser mayor que 0"); return; }

    startTransition(async () => {
      const dur = durationMonths ? parseInt(durationMonths) : null;
      const res = await createEnrollmentFromStudent(studentId, courseId, amt, paymentType, paymentOption, dur, platformId || null, tutorId || null);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
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
        <div className="p-6 space-y-4">
          {/* Course */}
          <div>
            <label className={labelCls}>Curso</label>
            <select value={courseId} onChange={e => handleCourseChange(e.target.value)} className={inputCls}>
              <option value="">Selecciona un curso…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

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
          {/* Tutor */}
          {tutors.length > 0 && (
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
        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <BookMarked className="h-4 w-4" />
            {isPending ? "Generando…" : "Generar matrícula"}
          </button>
        </div>
      </div>
    </div>
  );
}
