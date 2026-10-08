"use client";

import { useState, useTransition, useRef } from "react";
import QRCode from "react-qr-code";
import { Award, Plus, Search, X, Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CertificateRow, EnrollmentPreview } from "@/lib/data/certificates.repository";
import {
  createCertificateAction,
  deactivateCertificateAction,
  searchEnrollmentsAction,
} from "@/app/(app)/certificates/actions";

const QR_BASE = "https://esmeraonline.com/verificar-certificado";

const inputCls  = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow placeholder:text-slate-400";
const labelCls  = "block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1";
const btnPrimary = "flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnDanger  = "flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Backdrop + Drawer shell ─────────────────────────────────────────────────

function Drawer({
  open, onClose, title, icon: Icon, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {children}
        </div>
      </div>
    </>
  );
}

// ── Confirm modal ───────────────────────────────────────────────────────────

function ConfirmModal({
  open, certNumber, onClose, onConfirm, isPending,
}: {
  open: boolean;
  certNumber: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">¿Desactivar este certificado?</h3>
        <p className="text-sm text-slate-500">
          El certificado Nº <strong className="text-slate-800">{certNumber}</strong> quedará
          inválido permanentemente. Si hay un error, crea uno nuevo.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 text-sm font-semibold px-4 py-2.5 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isPending} className={cn(btnDanger, "flex-1")}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sí, desactivar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Enrollment search ───────────────────────────────────────────────────────

function EnrollmentSearch({ onSelect }: { onSelect: (e: EnrollmentPreview) => void }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<EnrollmentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(val: string) {
    setQuery(val);
    if (timeout.current) clearTimeout(timeout.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timeout.current = setTimeout(async () => {
      setLoading(true);
      const r = await searchEnrollmentsAction(val);
      setResults(r);
      setOpen(r.length > 0);
      setLoading(false);
    }, 300);
  }

  function pick(e: EnrollmentPreview) {
    setOpen(false);
    setQuery(`#${e.enrollment_number} — ${e.student_name}`);
    setResults([]);
    onSelect(e);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />
        )}
        <input
          className={cn(inputCls, "pl-8")}
          placeholder="Buscar por nº de matrícula o nombre..."
          value={query}
          onChange={e => handleChange(e.target.value)}
        />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {results.map(e => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => pick(e)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-900">#{e.enrollment_number}</span>
                <span className="text-slate-500"> — {e.student_name}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{e.course_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Create drawer ───────────────────────────────────────────────────────────

function CreateDrawer({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (cert: CertificateRow) => void;
}) {
  const [preview,     setPreview]     = useState<EnrollmentPreview | null>(null);
  const [studentName, setStudentName] = useState("");
  const [courseName,  setCourseName]  = useState("");
  const [hours,       setHours]       = useState("");
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [isPending,   startTransition] = useTransition();

  function handleSelect(e: EnrollmentPreview) {
    setPreview(e);
    setStudentName(e.student_name);
    setCourseName(e.course_name);
    setHours(e.hours != null ? String(e.hours) : "");
    setStartDate(e.start_date ?? "");
    setEndDate(e.end_date ?? "");
  }

  function handleClose() {
    setPreview(null);
    setStudentName(""); setCourseName(""); setHours("");
    setStartDate(""); setEndDate("");
    onClose();
  }

  function handleSubmit() {
    if (!preview) return;
    startTransition(async () => {
      try {
        const cert = await createCertificateAction({
          enrollment_id: preview.id,
          student_name:  studentName,
          course_name:   courseName,
          hours:         hours ? Number(hours) : null,
          start_date:    startDate || null,
          end_date:      endDate || null,
        });
        toast.success(`Certificado Nº ${cert.certificate_number} generado`);
        onCreated(cert);
        handleClose();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error al generar el certificado");
      }
    });
  }

  const certNumber = preview ? `??????-${preview.enrollment_number}` : null;
  const qrUrl      = certNumber ? `${QR_BASE}/${certNumber}` : null;

  return (
    <Drawer open={open} onClose={handleClose} title="Nuevo certificado" icon={Award}>
      {/* Búsqueda de matrícula */}
      <div>
        <label className={labelCls}>Matrícula</label>
        <EnrollmentSearch onSelect={handleSelect} />
      </div>

      {preview && (
        <>
          {/* Datos editables */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div>
              <label className={labelCls}>Nombre del alumno</label>
              <input className={inputCls} value={studentName} onChange={e => setStudentName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Curso</label>
              <input className={inputCls} value={courseName} onChange={e => setCourseName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Horas</label>
                <input type="number" className={inputCls} value={hours} onChange={e => setHours(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Inicio</label>
                <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Fin</label>
                <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* QR preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className={labelCls}>Vista previa del QR</p>
            <QRCode value={qrUrl!} size={150} />
            <p className="text-[11px] text-slate-400 text-center break-all">{qrUrl}</p>
            <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              Nº {certNumber}
            </span>
            <p className="text-[10px] text-slate-400 text-center">El código aleatorio se genera al guardar</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending || !studentName.trim() || !courseName.trim()}
            className={btnPrimary}
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
              : <><Award className="h-4 w-4" /> Generar certificado</>
            }
          </button>
        </>
      )}
    </Drawer>
  );
}

// ── Detail drawer ───────────────────────────────────────────────────────────

function DetailDrawer({
  cert, onClose, onDeactivated,
}: {
  cert: CertificateRow | null;
  onClose: () => void;
  onDeactivated: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending,   startTransition] = useTransition();

  function handleDeactivate() {
    if (!cert) return;
    startTransition(async () => {
      await deactivateCertificateAction(cert.id);
      toast.success("Certificado desactivado");
      onDeactivated(cert.id);
      setConfirmOpen(false);
      onClose();
    });
  }

  if (!cert) return null;
  const qrUrl = `${QR_BASE}/${cert.certificate_number}`;

  return (
    <>
      <Drawer open={!!cert} onClose={onClose} title="Certificado" icon={Award}>
        {/* Estado */}
        {!cert.active && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
            <ShieldOff className="h-4 w-4 shrink-0" />
            Este certificado está desactivado
          </div>
        )}

        {/* QR */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
          <p className={labelCls}>Código QR de verificación</p>
          <div className={cn(!cert.active && "opacity-40 grayscale")}>
            <QRCode value={qrUrl} size={160} />
          </div>
          <p className="text-[11px] text-slate-400 text-center break-all">{qrUrl}</p>
          <span className="text-sm font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
            Nº {cert.certificate_number}
          </span>
        </div>

        {/* Datos */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
          <DataRow label="Alumno"   value={cert.student_name} />
          <DataRow label="Curso"    value={cert.course_name} />
          <DataRow label="Horas"    value={cert.hours != null ? `${cert.hours} h` : "—"} />
          <DataRow label="Inicio"   value={formatDate(cert.start_date)} />
          <DataRow label="Fin"      value={formatDate(cert.end_date)} />
          <DataRow label="Emitido"  value={formatDate(cert.issued_at)} />
        </div>

        {cert.active && (
          <button onClick={() => setConfirmOpen(true)} className={btnDanger}>
            <ShieldOff className="h-4 w-4" />
            Desactivar certificado
          </button>
        )}
      </Drawer>

      <ConfirmModal
        open={confirmOpen}
        certNumber={cert.certificate_number}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeactivate}
        isPending={isPending}
      />
    </>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function CertificatesClient({ initial }: { initial: CertificateRow[] }) {
  const [certs,       setCerts]       = useState<CertificateRow[]>(initial);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [selected,    setSelected]    = useState<CertificateRow | null>(null);
  const [query,       setQuery]       = useState("");

  const filtered = query.trim()
    ? certs.filter(c =>
        c.certificate_number?.toLowerCase().includes(query.toLowerCase()) ||
        c.student_name?.toLowerCase().includes(query.toLowerCase()) ||
        c.course_name?.toLowerCase().includes(query.toLowerCase())
      )
    : certs;

  function handleCreated(cert: CertificateRow) {
    setCerts(prev => [cert, ...prev]);
  }

  function handleDeactivated(id: string) {
    setCerts(prev => prev.map(c => c.id === id ? { ...c, active: false } : c));
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Certificados</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {filtered.length} de {certs.length} certificado{certs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo certificado
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por código, alumno o curso…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={cn(inputCls, "pl-8")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Award className="h-10 w-10 opacity-20" />
          <p className="text-sm">{query ? "Sin resultados para esa búsqueda" : "No hay certificados emitidos aún"}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Nº", "Alumno", "Curso", "Emitido", "Estado"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(cert => (
                <tr
                  key={cert.id}
                  onClick={() => setSelected(cert)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{cert.certificate_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{cert.student_name}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{cert.course_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(cert.issued_at)}</td>
                  <td className="px-4 py-3">
                    {cert.active ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200/60">
                        Válido
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200/60">
                        Desactivado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <DetailDrawer
        cert={selected}
        onClose={() => setSelected(null)}
        onDeactivated={handleDeactivated}
      />
    </>
  );
}
