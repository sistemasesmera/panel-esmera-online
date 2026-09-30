import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LogRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  users: { full_name: string | null; email: string | null } | null;
};

export async function listLogs(limit = 100): Promise<LogRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_id, details, created_at, users:user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LogRow[];
}
