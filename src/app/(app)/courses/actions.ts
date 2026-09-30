"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth/require-role";

export type CourseFormData = {
  name: string;
  code: string;
  category: string;
  description: string;
  duration_hours: string;
  price: string;
  active: boolean;
};

const BUCKET = "course-docs";

export async function createCourse(form: CourseFormData, dossierFormData?: FormData) {
  await requireCapability("manageCourses");
  const db = createAdminClient() as any;

  const { data: inserted, error } = await db.from("courses").insert({
    name:           form.name.trim(),
    code:           form.code.trim() || null,
    category:       form.category.trim() || null,
    description:    form.description.trim() || null,
    duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
    price:          form.price ? Number(form.price) : null,
    active:         form.active,
  }).select("id").single();

  if (error) return { error: error.message };

  const courseId = (inserted as { id: string }).id;

  if (dossierFormData) {
    const url = await uploadDossier(courseId, dossierFormData);
    if (url) {
      await db.from("courses").update({ dossier_url: url }).eq("id", courseId);
    }
  }

  revalidatePath("/courses");
  return { success: true };
}

export async function updateCourse(id: string, form: CourseFormData, dossierFormData?: FormData) {
  await requireCapability("manageCourses");
  const db = createAdminClient() as any;

  const update: Record<string, unknown> = {
    name:           form.name.trim(),
    code:           form.code.trim() || null,
    category:       form.category.trim() || null,
    description:    form.description.trim() || null,
    duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
    price:          form.price ? Number(form.price) : null,
    active:         form.active,
    updated_at:     new Date().toISOString(),
  };

  if (dossierFormData) {
    const url = await uploadDossier(id, dossierFormData);
    if (url) update.dossier_url = url;
  }

  const { error } = await db.from("courses").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/courses");
  return { success: true };
}

export async function toggleCourseActive(id: string, active: boolean) {
  await requireCapability("manageCourses");
  const db = createAdminClient() as any;

  const { error } = await db.from("courses")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/courses");
  return { success: true };
}

// ── Upload dossier to Supabase Storage ───────────────────────────────────────
async function uploadDossier(courseId: string, fd: FormData): Promise<string | null> {
  const file = fd.get("dossier") as File | null;
  if (!file || file.size === 0) return null;

  const supabase = createAdminClient();
  const path = `${courseId}/dossier.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: true });

  if (error) {
    console.error("[uploadDossier]", error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
