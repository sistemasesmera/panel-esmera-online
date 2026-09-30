"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Upload, Trash2, FileText, Image, FileArchive, File, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { uploadEnrollmentAttachment, deleteEnrollmentAttachment } from "@/app/(app)/enrollments/[id]/actions";

export type AttachmentRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
  signed_url: string | null;
  inherited?: boolean;
};

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return Image;
  if (["zip","rar","7z","tar","gz"].includes(ext)) return FileArchive;
  if (["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"].includes(ext)) return FileText;
  return File;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EnrollmentAttachmentsPanel({
  enrollmentId,
  initialAttachments,
}: {
  enrollmentId: string;
  initialAttachments: AttachmentRow[];
}) {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId]  = useState<string | null>(null);
  const [uploading, setUploading]    = useState(false);

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadEnrollmentAttachment(enrollmentId, fd);
      if ("error" in res) toast.error(`Error al subir ${file.name}: ${res.error}`);
      else { toast.success(`✓ ${file.name} adjuntado correctamente`); ok++; }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) router.refresh();
  }

  function handleDelete(id: string, path: string) {
    if (!confirm("¿Eliminar este adjunto?")) return;
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteEnrollmentAttachment(enrollmentId, id, path);
      setDeletingId(null);
      if ("error" in res) toast.error(res.error);
      else toast.success("Adjunto eliminado");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 card-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Adjuntos</h2>
          {initialAttachments.length > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {initialAttachments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || isPending}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Subiendo…" : "Subir archivo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />
      </div>

      {initialAttachments.length === 0 ? (
        <div
          className="px-5 py-10 text-center cursor-pointer group"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-7 w-7 text-slate-200 mx-auto mb-2 group-hover:text-slate-300 transition-colors" />
          <p className="text-sm text-slate-400 group-hover:text-slate-500 transition-colors">
            No hay adjuntos. Haz clic para subir archivos.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {initialAttachments.map(att => {
            const Icon = fileIcon(att.file_name);
            return (
              <li key={att.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                <Icon className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{att.file_name}</p>
                    {att.inherited && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                        Lead
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {fmtSize(att.file_size)}{att.file_size ? " · " : ""}{formatDate(att.created_at)}
                  </p>
                </div>
                {att.signed_url && (
                  <a
                    href={att.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver
                  </a>
                )}
                {!att.inherited && (
                  <button
                    onClick={() => handleDelete(att.id, att.file_path)}
                    disabled={deletingId === att.id || isPending}
                    className="rounded p-1 text-slate-200 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
