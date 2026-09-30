import { requireAuth } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgendaClient } from "@/components/features/agenda/agenda-client";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const user = await requireAuth();
  const db   = createAdminClient() as any;

  const isAdmin = user.role === "administracion";

  const citasQuery = db
    .from("citas")
    .select("*")
    .order("scheduled_at", { ascending: true });

  if (!isAdmin) citasQuery.eq("comercial_id", user.id);

  const [{ data: citas = [] }, { data: staff = [] }] = await Promise.all([
    citasQuery,
    isAdmin
      ? db.from("users").select("id, full_name").in("role", ["setter", "closer", "administracion"]).order("full_name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500 mt-0.5">Citas agendadas con leads</p>
      </div>
      <AgendaClient citas={citas ?? []} isAdmin={isAdmin} staff={staff ?? []} />
    </div>
  );
}
