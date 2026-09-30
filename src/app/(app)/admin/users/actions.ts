"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability, requireAuth } from "@/lib/auth/require-role";
import { APP_ROLES, type AppRole } from "@/lib/domain/shared/permissions";

export type UserFormData = {
  email: string;
  full_name: string;
  password: string;
  role: AppRole;
};

export async function createUser(form: UserFormData) {
  await requireCapability("manageUsers");
  const supabase = createAdminClient();
  const db = supabase as any;

  if (!form.email.trim() || !form.full_name.trim() || !form.password.trim()) {
    return { error: "Nombre, email y contraseña son obligatorios" };
  }
  if (!APP_ROLES.includes(form.role)) {
    return { error: "Rol no válido" };
  }
  if (form.password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: form.email.trim().toLowerCase(),
    password: form.password,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes("already registered")) {
      return { error: "Ya existe un usuario con ese email" };
    }
    return { error: authErr.message };
  }

  // Upsert into users table (trigger may have already inserted the row)
  const { error: dbErr } = await db.from("users").upsert({
    id:        authData.user.id,
    email:     form.email.trim().toLowerCase(),
    full_name: form.full_name.trim(),
    role:      form.role,
  }, { onConflict: "id" });

  if (dbErr) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: dbErr.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(id: string, data: { full_name: string; role: AppRole; password?: string }) {
  await requireCapability("manageUsers");
  const supabase = createAdminClient();
  const db = supabase as any;

  if (!data.full_name.trim()) return { error: "El nombre es obligatorio" };
  if (!APP_ROLES.includes(data.role)) return { error: "Rol no válido" };

  const { error: dbErr } = await db
    .from("users")
    .update({ full_name: data.full_name.trim(), role: data.role, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (dbErr) return { error: dbErr.message };

  if (data.password && data.password.trim().length > 0) {
    if (data.password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
    const { error: pwErr } = await supabase.auth.admin.updateUserById(id, { password: data.password });
    if (pwErr) return { error: pwErr.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  await requireCapability("manageUsers");
  const current = await requireAuth();

  if (current.id === id) {
    return { error: "No puedes eliminar tu propia cuenta" };
  }

  const supabase = createAdminClient();
  const db = supabase as any;

  // Delete from users table first (in case no cascade)
  await db.from("users").delete().eq("id", id);

  // Delete auth user
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}
