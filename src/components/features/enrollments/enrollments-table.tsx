"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, Search, X } from "lucide-react";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "pendiente_firma", label: "Pendiente de firma", cls: "bg-amber-50 text-amber-600 ring-1 ring-amber-200/60" },
  { value: "en_curso",        label: "En curso",           cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60" },
  { value: "finalizada",      label: "Finalizada",         cls: "bg-blue-50 text-blue-600 ring-1 ring-blue-200/60" },
  { value: "cancelada",       label: "Cancelada",          cls: "bg-red-50 text-red-500 ring-1 ring-red-200/60" },
];

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

function expiryRowCls(endDate: string | null): string {
  if (!endDate) return "hover:bg-slate-50/70";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(endDate).getTime() - today.getTime()) / 86_400_000);
  if (days < 0)  return "bg-slate-100 hover:bg-slate-200/60";
  if (days < 7)  return "bg-red-50 hover:bg-red-100/60";
  if (days < 30) return "bg-amber-50 hover:bg-amber-100/60";
  return "hover:bg-slate-50/70";
}

type Enrollment = {
  id: string;
  enrollment_number: number;
  status: string;
  enrollment_date: string;
  start_date: string | null;
  end_date: string | null;
  students:  { full_name: string; email: string } | null;
  courses:   { name: string } | null;
  tutor:     { full_name: string } | null;
};

export function EnrollmentsTable({ enrollments }: { enrollments: Enrollment[] }) {
  const [query,  setQuery]  = useState("");
  const [status, setStatus] = useState("");
  const [course, setCourse] = useState("");

  const courses = useMemo(() => {
    const names = [...new Set(enrollments.map(e => e.courses?.name).filter(Boolean) as string[])];
    return names.sort();
  }, [enrollments]);

  const hasFilters = query || status || course;

  function clearFilters() {
    setQuery("");
    setStatus("");
    setCourse("");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrollments.filter(e => {
      if (q && !(
        e.enrollment_number.toString().includes(q) ||
        e.students?.full_name.toLowerCase().includes(q) ||
        e.students?.email.toLowerCase().includes(q)
      )) return false;
      if (status && e.status        !== status) return false;
      if (course && e.courses?.name !== course) return false;
      return true;
    });
  }, [enrollments, query, status, course]);

  const selectCls = "rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nº, nombre o email…"
            className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} className={cn(selectCls, !status && "text-slate-400")}>
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-400" />
        </div>

        {/* Course filter */}
        {courses.length > 0 && (
          <div className="relative">
            <select value={course} onChange={e => setCourse(e.target.value)} className={cn(selectCls, !course && "text-slate-400")}>
              <option value="">Todos los cursos</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-400" />
          </div>
        )}

        {/* Clear + count */}
        <div className="flex items-center gap-2 ml-auto">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="cursor-pointer flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {filtered.length} {filtered.length === 1 ? "matrícula" : "matrículas"}
          </span>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {status && (
            <FilterChip label={STATUS_MAP[status]?.label ?? status} onRemove={() => setStatus("")} />
          )}
          {course && (
            <FilterChip label={course} onRemove={() => setCourse("")} />
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center card-shadow">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <BookMarked className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {hasFilters ? "No hay matrículas con esos filtros" : "No hay matrículas registradas aún"}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="cursor-pointer mt-2 text-xs text-indigo-600 font-semibold hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Nº</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alumno</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Curso</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tutor asignado</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha alta</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha inicio</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha fin</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const s = STATUS_MAP[e.status] ?? { label: e.status, cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60" };
                return (
                  <tr key={e.id} className={cn("transition-colors group", expiryRowCls(e.end_date))}>
                    <td className="px-5 py-3.5">
                      <Link href={`/enrollments/${e.id}`} className="font-mono text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                        #{e.enrollment_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/enrollments/${e.id}`} className="block">
                        <p className="font-semibold text-slate-900 leading-tight">{e.students?.full_name ?? "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{e.students?.email ?? ""}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium text-xs max-w-[180px] truncate">
                      {e.courses?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {e.tutor?.full_name ?? <span className="text-slate-300">Sin asignar</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full", s.cls)}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                      {formatDateTime(e.enrollment_date)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                      {e.start_date ? formatDate(e.start_date) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                      {e.end_date ? formatDate(e.end_date) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="pr-4">
                      <Link href={`/enrollments/${e.id}`}>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-2.5 py-1 ring-1 ring-indigo-200/60">
      {label}
      <button onClick={onRemove} className="cursor-pointer ml-0.5 hover:text-indigo-900 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
