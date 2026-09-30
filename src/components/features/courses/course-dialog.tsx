"use client";

import { useRef, useState, useTransition } from "react";
import { X, Loader2, FileText, UploadCloud, ExternalLink } from "lucide-react";
import { createCourse, updateCourse, type CourseFormData } from "@/app/(app)/courses/actions";
import type { Course } from "@/lib/data/courses.repository";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Uñas",
  "Cejas y Pestañas",
  "Micropigmentación",
  "Marketing / Ventas",
  "Marketing Digital",
  "Inteligencia Artificial",
  "Prevención de riesgos laborales",
  "Video e Imagen",
  "Diseño gráfico y Web",
];

type Props = {
  course?: Course;
  onClose: () => void;
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";

export function CourseDialog({ course, onClose }: Props) {
  const isEdit = !!course;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState(
    course?.category && !CATEGORIES.includes(course.category) ? course.category : ""
  );
  const [categoryMode, setCategoryMode] = useState<"select" | "custom">(
    course?.category && !CATEGORIES.includes(course.category) ? "custom" : "select"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CourseFormData>({
    name:           course?.name ?? "",
    code:           course?.code ?? "",
    category:       course?.category ?? "",
    description:    course?.description ?? "",
    duration_hours: course?.duration_hours?.toString() ?? "",
    price:          course?.price?.toString() ?? "",
    active:         course?.active ?? true,
  });

  function set(key: keyof CourseFormData, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      setError("El dossier debe ser un archivo PDF");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);

    const finalForm: CourseFormData = {
      ...form,
      category: categoryMode === "custom" ? customCategory : form.category,
    };

    let dossierFd: FormData | undefined;
    if (selectedFile) {
      dossierFd = new FormData();
      dossierFd.append("dossier", selectedFile);
    }

    startTransition(async () => {
      const res = isEdit
        ? await updateCourse(course.id, finalForm, dossierFd)
        : await createCourse(finalForm, dossierFd);
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black tracking-tight">
            {isEdit ? "Editar curso" : "Nuevo curso"}
          </h2>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Nombre del curso" required>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Ej: Curso Profesional de Uñas"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Código">
              <input
                className={inputCls}
                value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase())}
                placeholder="Ej: CPUE1"
              />
            </Field>
            <Field label="Estado">
              <button
                type="button"
                onClick={() => set("active", !form.active)}
                className={cn(
                  "cursor-pointer w-full text-sm font-semibold px-3 py-2 rounded-lg border transition-colors",
                  form.active
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                )}
              >
                {form.active ? "✓ Activo" : "× Inactivo"}
              </button>
            </Field>
          </div>

          <Field label="Categoría">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryMode("select")}
                  className={cn("cursor-pointer text-xs font-semibold px-3 py-1 rounded-full border transition-colors",
                    categoryMode === "select" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >Existente</button>
                <button
                  type="button"
                  onClick={() => setCategoryMode("custom")}
                  className={cn("cursor-pointer text-xs font-semibold px-3 py-1 rounded-full border transition-colors",
                    categoryMode === "custom" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >Nueva categoría</button>
              </div>
              {categoryMode === "select" ? (
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={e => set("category", e.target.value)}
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input
                  className={inputCls}
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Nombre de la nueva categoría"
                />
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (horas)">
              <input
                type="number"
                min="0"
                step="0.5"
                className={inputCls}
                value={form.duration_hours}
                onChange={e => set("duration_hours", e.target.value)}
                placeholder="Ej: 200"
              />
            </Field>
            <Field label="Precio (€)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder="Ej: 599"
              />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea
              rows={3}
              className={cn(inputCls, "resize-none")}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Descripción breve del curso (opcional)"
            />
          </Field>

          {/* Dossier upload */}
          <Field label="Dossier (PDF)">
            <div className="space-y-2">
              {/* Show current dossier if editing */}
              {isEdit && course.dossier_url && !selectedFile && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate flex-1">Dossier actual</span>
                  <a
                    href={course.dossier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-700 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Drop zone / file picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "cursor-pointer w-full flex flex-col items-center gap-1.5 px-4 py-4 rounded-lg border-2 border-dashed transition-colors text-sm",
                  selectedFile
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-400"
                )}
              >
                {selectedFile ? (
                  <>
                    <FileText className="h-5 w-5 text-indigo-500" />
                    <span className="font-semibold text-xs truncate max-w-full px-2">{selectedFile.name}</span>
                    <span className="text-[11px] text-indigo-400">{(selectedFile.size / 1024).toFixed(0)} KB — haz clic para cambiar</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-5 w-5" />
                    <span className="font-semibold text-xs">
                      {isEdit && course.dossier_url ? "Subir nuevo dossier" : "Subir dossier"}
                    </span>
                    <span className="text-[11px]">Solo PDF · haz clic para seleccionar</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear curso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
