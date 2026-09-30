import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: contractRow } = await admin
    .from("contracts")
    .select("id, docuseal_submission_id")
    .eq("enrollment_id", id)
    .single();

  const contract = contractRow as unknown as { id: string; docuseal_submission_id: string | null } | null;
  if (!contract) return Response.json({ error: "Contrato no encontrado" }, { status: 404 });

  const submissionId = contract.docuseal_submission_id;

  if (submissionId) {
    const apiKey = process.env.DOCUSEAL_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://api.docuseal.eu/submissions/${submissionId}`, {
          method: "DELETE",
          headers: { "X-Auth-Token": apiKey },
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("[cancel-signature] DocuSeal DELETE error:", res.status, text);
        }
      } catch (err) {
        console.error("[cancel-signature] DocuSeal request failed:", err);
      }
    }

    await db.from("contracts")
      .update({ docuseal_submission_id: null, docuseal_signing_url: null, sent_at: null, status: "borrador" })
      .eq("id", contract.id);

    await db.from("contract_events")
      .insert({ contract_id: contract.id, enrollment_id: id, event_type: "cancelled" });
  }

  return Response.json({ ok: true });
}
