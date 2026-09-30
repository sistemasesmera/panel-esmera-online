import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/domain/shared/permissions";

export type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  created_at: string;
};

export async function listUsers(): Promise<UserRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserRow[];
}
