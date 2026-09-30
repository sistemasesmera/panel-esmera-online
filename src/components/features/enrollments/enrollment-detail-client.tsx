"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send, X, FileText, RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ContractStatus = "borrador" | "enviado" | "firmado";

type ContractEvent = {
  id: string;
  event_type: string;
  email: string | null;
  occurred_at: string;
  decline_reason: string | null;
};

type Props = {
  enrollmentId: string;
  contract: {
    id: string;
    status: ContractStatus;
    amount: number;
    payment_type: string | null;
    sent_at: string | null;
    signed_at: string | null;
    declined_at: string | null;
    document_url: string | null;
    docuseal_signing_url: string | null;
  } | null;
  events: ContractEvent[];
  studentEmail: string;
};

const CONTRACT_STATUS: Record<ContractStatus, { label: string; cls: string; icon: ReactNode }> = {
  borrador: {
    label: "Borrador",
    cls:   "bg-slate-100 text-slate-600",
    icon:  <Clock className="h-3.5 w-3.5" />,
  },
  enviado: {
    label: "Enviado — pendiente de firma",
    cls:   "bg-amber-100 text-amber-700",
    icon:  <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
  },
  firmado: {
    label: "Firmado",
    cls:   "bg-emerald-100 text-emerald-700",
    icon:  <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

const EVENT_LABELS: Record<string, { label: string; cls: string }> = {
  sent:      { label: "Enviado para firma",  cls: "bg-blue-100 text-blue-700" },
  signed:    { label: "Firmado",             cls: "bg-emerald-100 text-emerald-700" },
  declined:  { label: "Rechazado",           cls: "bg-red-100 text-red-700" },
  expired:   { label: "Caducado",            cls: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelado",           cls: "bg-orange-100 text-orange-700" },
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  contado:    "Contado",
  financiado: "Financiado",
  mixto:      "Mixto",
};

function fmtEur(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function EnrollmentDetailClient({ enrollmentId, contract, events, studentEmail }: Props) {
  const router  = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expiry, setExpiry]     = useState("15d");
  const [email, setEmail]       = useState(studentEmail);

  const status = contract?.status ?? "borrador";
  const st     = CONTRACT_STATUS[status] ?? CONTRACT_STATUS.borrador;

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/send-for-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, expiry }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al enviar para firma");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("¿Cancelar el envío de firma? El enlace enviado al alumno quedará inválido.")) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/enrollments/${enrollmentId}/cancel-signature`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al cancelar");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  if (!contract) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">Sin contrato asociado</p>
        <p>Esta matrícula no tiene contrato creado. Es necesario crear el contrato antes de poder enviar para firma.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract panel */}
      <div className="bg-white rounded-xl border border-slate-200 card-shadow">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Contrato</h2>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full", st.cls)}>
            {st.icon}
            {st.label}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Contract info */}
          {contract && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Importe</p>
                <p className="font-bold text-slate-900">{fmtEur(contract.amount)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Tipo de pago</p>
                <p className="font-medium text-slate-700">{PAYMENT_TYPE_LABELS[contract.payment_type ?? ""] ?? "—"}</p>
              </div>
              {contract.sent_at && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Enviado</p>
                  <p className="text-slate-600">{fmtDate(contract.sent_at)}</p>
                </div>
              )}
              {contract.signed_at && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Firmado</p>
                  <p className="text-emerald-700 font-medium">{fmtDate(contract.signed_at)}</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          {status === "borrador" && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email del alumno</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expiración del enlace</label>
                  <select
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="5d">5 días</option>
                    <option value="10d">10 días</option>
                    <option value="15d">15 días</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !email}
                className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {loading ? "Enviando…" : "Enviar para firma"}
              </button>
            </div>
          )}

          {status === "enviado" && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="h-4 w-4" />
                {loading ? "Cancelando…" : "Cancelar envío"}
              </button>
              {contract?.docuseal_signing_url && (
                <a
                  href={contract.docuseal_signing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Ver enlace de firma
                </a>
              )}
            </div>
          )}

          {status === "firmado" && contract?.document_url && (
            <div className="pt-2">
              <a
                href={contract.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Descargar contrato firmado
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Events timeline */}
      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 card-shadow">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Historial de eventos</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {events.map((ev) => {
              const et = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, cls: "bg-slate-100 text-slate-600" };
              return (
                <li key={ev.id} className="flex items-start gap-4 px-5 py-3">
                  <span className={cn("shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5", et.cls)}>
                    {et.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    {ev.email && <p className="text-xs text-slate-500">{ev.email}</p>}
                    {ev.decline_reason && (
                      <p className="text-xs text-red-600 mt-0.5">Motivo: {ev.decline_reason}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-[11px] text-slate-400">{fmtDate(ev.occurred_at)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
