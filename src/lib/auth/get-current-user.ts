import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/domain/shared/permissions";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single() as { data: { full_name: string | null; role: string } | null; error: unknown };

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name ?? user.email ?? "",
    role: profile.role as AppRole,
  };
}
