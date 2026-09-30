"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, GraduationCap, Mail, Phone, ArrowRight } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Student } from "@/lib/data/students.repository";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-teal-400 to-teal-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
];


export function StudentsTable({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.dni_nie?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 w-72 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white rounded-xl px-4 py-2 border border-slate-200">
          <GraduationCap className="h-4 w-4 text-indigo-500" />
          <span>
            <span className="font-bold text-slate-900">{filtered.length}</span>
            {" "}{search ? "encontrados" : "alumnos"}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center card-shadow">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {search ? "No se encontraron alumnos con esa búsqueda" : "Aún no hay alumnos registrados"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alumno</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacto</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alta</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((student) => {
                const idx = student.full_name.charCodeAt(0) % 5;
                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link href={`/students/${student.id}`} className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold bg-gradient-to-br",
                            AVATAR_GRADIENTS[idx]
                          )}
                        >
                          {initials(student.full_name)}
                        </div>
                        <p className="font-semibold text-slate-900 leading-tight">{student.full_name}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-xs">{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="text-xs">{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                      {formatDateTime(student.created_at)}
                    </td>
                    <td className="pr-4">
                      <Link href={`/students/${student.id}`}>
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
