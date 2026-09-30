import { requireAuth } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgendaClient } from "@/components/features/agenda/agenda-client";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const user = await requireAuth();
  const db   = createAdminClient() as any;

  const isAdmin = user.role === "administracion";

  const query = db
    .from("citas")
    .select("*")
    .order("scheduled_at", { ascending: true });

  if (!isAdmin) query.eq("comercial_id", user.id);

  const { data: citas = [] } = await query;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500 mt-0.5">Citas agendadas con leads</p>
      </div>
      <AgendaClient citas={citas ?? []} isAdmin={isAdmin} />
    </div>
  );
}
