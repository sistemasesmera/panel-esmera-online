"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { importLeadsFromCsv, type ImportRow, type ImportResult } from "@/app/(app)/crm/pipeline/actions";

type Phase = "idle" | "preview" | "importing" | "done";

function parseCsv(text: string): ImportRow[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let val = "";
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        if (i < line.length && line[i] === ",") i++;
        fields.push(val);
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) { fields.push(line.slice(i)); break; }
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return fields;
  }

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
  const iNombre = headers.findIndex(h => h.includes("nombre"));
  const iEmail  = headers.findIndex(h => h.includes("email"));
  const iTel    = headers.findIndex(h => h.includes("tel"));
  const iOrigen = headers.findIndex(h => h.includes("origen"));
  const iCurso  = headers.findIndex(h => h.includes("curso"));

  if (iNombre === -1) return [];

  return lines.slice(1)
    .map(line => {
      const cols = parseLine(line);
      return {
        nombre:   (cols[iNombre]  ?? "").trim(),
        email:    (cols[iEmail]   ?? "").trim(),
        telefono: (cols[iTel]     ?? "").trim(),
        origen:   (cols[iOrigen]  ?? "").trim(),
        curso:    (cols[iCurso]   ?? "").trim(),
      };
    })
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
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (!parsed.length) {
        alert("No se encontraron filas válidas. Revisa que el CSV tenga las columnas: Nombre completo, Email, Teléfono, Origen, Curso.");
        return;
      }
      setRows(parsed);
      setPhase("preview");
    };
    reader.readAsText(file, "utf-8");
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
          <h2 className="text-base font-bold text-slate-800">Importar leads desde CSV</h2>
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
              <p className="text-sm font-semibold text-slate-700">Arrastra el CSV o haz clic para seleccionarlo</p>
              <p className="text-xs text-slate-400">Columnas esperadas: Nombre completo · Email · Teléfono · Origen · Curso</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
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
                <span><strong>{rows.length}</strong> leads listos para importar en la etapa <strong>Cualificado</strong></span>
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
