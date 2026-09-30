"use server";

import { requireCapability } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateCitaStatus(
  citaId: string,
  status: "completada" | "cancelada",
): Promise<{ success: true } | { error: string }> {
  await requireCapability("viewPipeline");
  const db = createAdminClient() as any;
  const { error } = await db.from("citas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", citaId);
  if (error) return { error: error.message };
  return { success: true };
}
