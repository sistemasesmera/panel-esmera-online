"use client";

import { useState, useTransition } from "react";
import { Plus, BookOpen, Clock, Euro, CheckCircle, XCircle, ExternalLink, Pencil } from "lucide-react";
import { toggleCourseActive } from "@/app/(app)/courses/actions";
import { CourseDialog } from "./course-dialog";
import type { Course } from "@/lib/data/courses.repository";
import { cn, fmt } from "@/lib/utils";
import { useRouter } from "next/navigation";

const CATEGORY_COLORS: Record<string, string> = {
  "Uñas":                            "bg-pink-100 text-pink-700",
  "Cejas y Pestañas":                "bg-purple-100 text-purple-700",
  "Micropigmentación":               "bg-rose-100 text-rose-700",
  "Marketing / Ventas":              "bg-blue-100 text-blue-700",
  "Marketing Digital":               "bg-blue-100 text-blue-700",
  "Inteligencia Artificial":         "bg-indigo-100 text-indigo-700",
  "Prevención de riesgos laborales": "bg-amber-100 text-amber-700",
  "Video e Imagen":                  "bg-teal-100 text-teal-700",
  "Diseño gráfico y Web":            "bg-cyan-100 text-cyan-700",
};

export function CoursesClient({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ open: boolean; course?: Course }>({ open: false });
  const [toggling, startToggle] = useTransition();

  const grouped: Record<string, Course[]> = {};
  for (const c of courses) {
    const cat = c.category ?? "Sin categoría";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  }

  function handleToggle(course: Course) {
    startToggle(async () => {
      await toggleCourseActive(course.id, !course.active);
      router.refresh();
    });
  }

  function handleClose() {
    setDialog({ open: false });
    router.refresh();
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Cursos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {courses.length} cursos · {Object.keys(grouped).length} categorías
          </p>
        </div>
        <button
          onClick={() => setDialog({ open: true })}
          className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo curso
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500 mb-4">No hay cursos registrados aún</p>
          <button
            onClick={() => setDialog({ open: true })}
            className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Crear primer curso
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, cats]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-3">
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-600")}>
                  {category}
                </span>
                <span className="text-xs text-slate-400">{cats.length} cursos</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cats.map((c) => (
                  <div key={c.id} className={cn(
                    "bg-white rounded-xl border p-5 card-shadow transition-colors",
                    c.active ? "border-slate-200 hover:border-indigo-200" : "border-slate-100 opacity-60"
                  )}>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        {c.code && (
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                            {c.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(c)}
                          disabled={toggling}
                          title={c.active ? "Desactivar" : "Activar"}
                          className={cn(
                            "cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-colors",
                            c.active ? "text-emerald-600 hover:text-slate-400" : "text-slate-400 hover:text-emerald-600"
                          )}
                        >
                          {c.active
                            ? <CheckCircle className="h-3.5 w-3.5" />
                            : <XCircle className="h-3.5 w-3.5" />
                          }
                          {c.active ? "Activo" : "Inactivo"}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => setDialog({ open: true, course: c })}
                          title="Editar curso"
                          className="cursor-pointer p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 leading-tight text-sm mb-1">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-1">{c.description}</p>
                    )}

                    {/* Bottom row */}
                    <div className="flex items-center gap-4 pt-3 border-t border-slate-100 mt-2">
                      {c.duration_hours != null && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {c.duration_hours}h
                        </div>
                      )}
                      {c.price != null && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <Euro className="h-3.5 w-3.5" />
                          {fmt(c.price)}
                        </div>
                      )}
                      {c.dossier_url && (
                        <a
                          href={c.dossier_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                        >
                          Dossier <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialog.open && (
        <CourseDialog
          course={dialog.course}
          onClose={handleClose}
        />
      )}
    </>
  );
}
