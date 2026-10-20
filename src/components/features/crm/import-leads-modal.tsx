"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { importLeadsFromCsv, type ImportRow, type ImportResult } from "@/app/(app)/crm/pipeline/actions";
import * as XLSX from "xlsx";

type Phase = "idle" | "preview" | "importing" | "done";

function parseWorkbook(wb: XLSX.WorkBook): ImportRow[] {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!raw.length) return [];

  const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const keys = Object.keys(raw[0]);
  const kNombre = keys.find(k => norm(k).includes("nombre"));
  const kEmail  = keys.find(k => norm(k).includes("email"));
  const kTel    = keys.find(k => norm(k).includes("tel"));
  const kOrigen = keys.find(k => norm(k).includes("origen"));
  const kCurso  = keys.find(k => norm(k).includes("curso"));

  if (!kNombre) return [];

  return raw
    .map(r => ({
      nombre:   String(r[kNombre]  ?? "").trim(),
      email:    String(kEmail  ? r[kEmail]  : "").trim(),
      telefono: String(kTel    ? r[kTel]    : "").trim(),
      origen:   String(kOrigen ? r[kOrigen] : "").trim(),
      curso:    String(kCurso  ? r[kCurso]  : "").trim(),
    }))
    .filter(r => r.nombre);
}

export function ImportLeadsModal({
  pipelineId,
  stageId,
  onClose,
}: {
  pipelineId: string;
  stageId:    string;
  onClose:    () => void;
}) {
  const router            = useRouter();
  const fileRef           = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows,  setRows]  = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const buf = e.target?.result as ArrayBuffer;
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = parseWorkbook(wb);
      if (!parsed.length) {
        alert("No se encontraron filas válidas. Revisa que el archivo tenga las columnas: Nombre completo, Email, Teléfono, Origen, Curso.");
        return;
      }
      setRows(parsed);
      setPhase("preview");
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    setPhase("importing");
    startTransition(async () => {
      const res = await importLeadsFromCsv(rows, pipelineId, stageId);
      setResult(res);
      setPhase("done");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-slate-800">Importar leads desde Excel o CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Phase: idle ── */}
          {phase === "idle" && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Arrastra el archivo o haz clic para seleccionarlo</p>
              <p className="text-xs text-slate-400">Formatos: .xlsx · .csv — Columnas: Nombre completo · Email · Teléfono · Origen · Curso</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* ── Phase: preview ── */}
          {phase === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span><strong>{rows.length}</strong> leads listos para importar en la etapa <strong>Contactando</strong></span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold">
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Teléfono</th>
                      <th className="px-3 py-2 text-left">Origen</th>
                      <th className="px-3 py-2 text-left">Curso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800 truncate max-w-[140px]">{r.nombre}</td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-[140px]">{r.email || "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.telefono || "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.origen || "—"}</td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]">{r.curso || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <p className="text-center text-xs text-slate-400 py-2 border-t border-slate-100">
                    y {rows.length - 8} más…
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Phase: importing ── */}
          {phase === "importing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Importando {rows.length} leads…</p>
              <p className="text-xs text-slate-400">Esto puede tardar unos segundos. No cierres la ventana.</p>
            </div>
          )}

          {/* ── Phase: done ── */}
          {phase === "done" && result && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">
                  {result.imported} lead{result.imported !== 1 ? "s" : ""} importado{result.imported !== 1 ? "s" : ""} correctamente
                  {result.skipped > 0 && (
                    <span className="ml-2 font-normal text-emerald-700">
                      · {result.skipped} omitido{result.skipped !== 1 ? "s" : ""} (ya existían)
                    </span>
                  )}
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    {result.errors.length} error{result.errors.length !== 1 ? "es" : ""}
                  </div>
                  <ul className="text-xs text-slate-600 flex flex-col gap-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                        <span className="font-semibold">{e.nombre}:</span> {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          {phase === "done" ? (
            <button
              onClick={onClose}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              {phase === "preview" && (
                <button
                  onClick={handleImport}
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Importar {rows.length} leads
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
