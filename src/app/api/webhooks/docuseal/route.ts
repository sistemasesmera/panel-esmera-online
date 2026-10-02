import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEnrollmentSigned } from "@/lib/email/notify-enrollment";

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  return Response.json({ ok: true, route: "/api/webhooks/docuseal", status: "reachable" });
}

const BUCKET = "adjuntos";

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const [timestamp, signature] = header.split(".", 2);
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  try {
    return (
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    );
  } catch {
    return false;
  }
}

type ContractRow = { id: string; enrollment_id: string | null };

export async function POST(req: NextRequest) {
  const tag = "[webhook/docuseal]";
  console.log(tag, "▶ POST received from", req.headers.get("user-agent"), "at", new Date().toISOString());

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error(tag, "Failed to read body:", err);
    return Response.json({ error: "bad_body" }, { status: 400 });
  }
  console.log(tag, "Body length:", rawBody.length, "| First 200 chars:", rawBody.slice(0, 200));

  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-docuseal-signature");
    if (!verifySignature(rawBody, header, secret)) {
      console.warn(tag, "Signature mismatch — continuing. Header:", header?.slice(0, 60));
    } else {
      console.log(tag, "Signature verified OK");
    }
  } else {
    console.warn(tag, "DOCUSEAL_WEBHOOK_SECRET not set — skipping verification");
  }

  let payload: { event_type: string; data: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error(tag, "Invalid JSON body");
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { event_type, data } = payload;
  const submissionId = String((data as { id: number }).id);
  console.log(tag, "Event:", event_type, "| submission_id:", submissionId);

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // ── submission.completed ──────────────────────────────────────────────────
  if (event_type === "submission.completed") {
    const { data: contractRaw, error: findError } = await (supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", submissionId)
      .single() as unknown as Promise<{ data: ContractRow | null; error: unknown }>);

    if (findError || !contractRaw) {
      console.error(tag, "Contract not found for submission_id:", submissionId);
      return Response.json({ received: true });
    }

    const d = data as {
      completed_at?: string;
      documents?: Array<{ name: string; url: string }>;
      submitters?: Array<{ documents?: Array<{ name: string; url: string }> }>;
    };

    const signedAt    = d.completed_at ?? new Date().toISOString();
    const docusealUrl = d.documents?.[0]?.url ?? d.submitters?.[0]?.documents?.[0]?.url ?? null;

    await db.from("contracts")
      .update({ status: "firmado", signed_at: signedAt, document_url: docusealUrl })
      .eq("id", contractRaw.id);

    await db.from("contract_events")
      .insert({ contract_id: contractRaw.id, enrollment_id: contractRaw.enrollment_id, event_type: "signed", occurred_at: signedAt });

    // Advance enrollment to "en_curso" and auto-calculate start/end dates
    if (contractRaw.enrollment_id) {
      const { data: enr } = await db
        .from("enrollments")
        .select("duration_months, start_date")
        .eq("id", contractRaw.enrollment_id)
        .single();

      const startDate = signedAt.slice(0, 10); // YYYY-MM-DD
      const endDate   = enr?.duration_months
        ? addMonths(startDate, enr.duration_months)
        : null;

      const enrollmentUpdate: Record<string, unknown> = { status: "en_curso", updated_at: signedAt };
      if (!enr?.start_date)  enrollmentUpdate.start_date = startDate;
      if (endDate)           enrollmentUpdate.end_date   = endDate;

      await db.from("enrollments")
        .update(enrollmentUpdate)
        .eq("id", contractRaw.enrollment_id)
        .eq("status", "pendiente_firma");
    }

    if (contractRaw.enrollment_id) revalidatePath(`/enrollments/${contractRaw.enrollment_id}`);

    // Send email notification on contract signed (non-blocking)
    if (contractRaw.enrollment_id) {
      notifyEnrollmentSigned(db, contractRaw.enrollment_id).catch(() => {});
    }

    // Download signed PDF to Supabase Storage (best-effort)
    if (docusealUrl && contractRaw.enrollment_id) {
      try {
        const pdfRes = await fetch(docusealUrl);
        if (pdfRes.ok) {
          const pdfBuffer   = await pdfRes.arrayBuffer();
          const storagePath = `contracts/${contractRaw.enrollment_id}/contrato-firmado.pdf`;
          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

          if (!uploadErr) {
            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            if (urlData?.signedUrl) {
              await db.from("contracts")
                .update({ document_url: urlData.signedUrl })
                .eq("id", contractRaw.id);
            }
          } else {
            console.error(tag, "Storage upload error:", uploadErr.message);
          }
        }
      } catch (err) {
        console.error(tag, "PDF upload exception:", err);
      }
    }
  }

  // ── submission.expired ────────────────────────────────────────────────────
  if (event_type === "submission.expired") {
    const { data: contractRaw } = await (supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", submissionId)
      .single() as unknown as Promise<{ data: ContractRow | null; error: unknown }>);

    if (contractRaw) {
      await db.from("contracts")
        .update({ status: "borrador", docuseal_submission_id: null, docuseal_signing_url: null, sent_at: null })
        .eq("id", contractRaw.id);

      await db.from("contract_events")
        .insert({ contract_id: contractRaw.id, enrollment_id: contractRaw.enrollment_id, event_type: "expired" });

      if (contractRaw.enrollment_id) revalidatePath(`/enrollments/${contractRaw.enrollment_id}`);
    }
  }

  // ── form.declined ─────────────────────────────────────────────────────────
  if (event_type === "form.declined") {
    const declinedSubmissionId = String(
      (data as { submission?: { id: number } }).submission?.id ?? submissionId
    );
    const { data: contractRaw } = await (supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", declinedSubmissionId)
      .single() as unknown as Promise<{ data: ContractRow | null; error: unknown }>);

    if (contractRaw) {
      const declinedAt    = (data as { declined_at?: string }).declined_at ?? new Date().toISOString();
      const declineReason = (data as { decline_reason?: string }).decline_reason ?? null;

      await db.from("contracts")
        .update({ status: "borrador", declined_at: declinedAt, docuseal_submission_id: null, docuseal_signing_url: null, sent_at: null })
        .eq("id", contractRaw.id);

      await db.from("contract_events")
        .insert({ contract_id: contractRaw.id, enrollment_id: contractRaw.enrollment_id, event_type: "declined", occurred_at: declinedAt, decline_reason: declineReason });

      if (contractRaw.enrollment_id) revalidatePath(`/enrollments/${contractRaw.enrollment_id}`);
    }
  }

  return Response.json({ received: true });
}

