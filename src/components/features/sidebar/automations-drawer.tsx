"use client";

import { X, Zap, CheckCircle2, Clock } from "lucide-react";

type Automation = {
  title:    string;
  trigger:  string;
  action:   string;
  system:   "Panel" | "GHL";
  status:   "activa" | "pendiente";
};

const AUTOMATIONS: Automation[] = [
  {
    title:   "Lead nuevo → Contactando",
    trigger: "Se añade nota o adjunto a un lead en etapa 'Lead nuevo'",
    action:  "Avanza automáticamente la etapa a 'Contactando' en GHL y registra el cambio",
    system:  "Panel",
    status:  "activa",
  },
  {
    title:   "Lead nuevo / Contactando → Cualificando",
    trigger: "Se guarda la ficha de cualificación con cualquier dato",
    action:  "Avanza la etapa a 'Cualificando' en GHL y registra el cambio",
    system:  "Panel",
    status:  "activa",
  },
  {
    title:   "Marcar como perdido",
    trigger: "Se pulsa 'Perdido' en la ficha de un lead",
    action:  "Mueve la tarjeta a la etapa 'Perdido' en GHL y guarda la nota con el motivo",
    system:  "Panel",
    status:  "activa",
  },
  {
    title:   "Marcar como no cualificado",
    trigger: "Se pulsa 'No cualificado' en la ficha de un lead",
    action:  "Mueve la tarjeta a la etapa 'No cualificado' en GHL y guarda la nota con el motivo",
    system:  "Panel",
    status:  "activa",
  },
  {
    title:   "Contrato firmado → Email de notificación",
    trigger: "El alumno firma el contrato en DocuSeal",
    action:  "El panel envía un email a info@esmeraonline.com, al comercial asignado, al tutor y a todos los administradores con los datos de la matrícula activa",
    system:  "Panel",
    status:  "activa",
  },
];

export function AutomationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const panel = AUTOMATIONS.filter(a => a.system === "Panel");
  const ghl   = AUTOMATIONS.filter(a => a.system === "GHL");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Automatizaciones</h2>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {AUTOMATIONS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <Section title="Panel" items={panel} />
          {ghl.length > 0 && <Section title="GoHighLevel (GHL)" items={ghl} />}
        </div>
      </div>
    </>
  );
}

function Section({ title, items }: { title: string; items: Automation[] }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 mb-3">{title}</p>
      <div className="space-y-3">
        {items.map(a => (
          <div key={a.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[12px] font-bold text-slate-800 leading-snug">{a.title}</p>
              {a.status === "activa" ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Activa
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <Clock className="h-2.5 w-2.5" />
                  Pendiente
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2 text-[11px]">
                <span className="shrink-0 font-semibold text-slate-400 w-14">Trigger</span>
                <span className="text-slate-600">{a.trigger}</span>
              </div>
              <div className="flex gap-2 text-[11px]">
                <span className="shrink-0 font-semibold text-slate-400 w-14">Acción</span>
                <span className="text-slate-600">{a.action}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
