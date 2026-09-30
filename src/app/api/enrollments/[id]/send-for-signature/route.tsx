import React from "react";
import fs from "fs";
import path from "path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentContractPDF, type EnrollmentContractData } from "@/lib/pdf/enrollment-contract";

let montserratRegistered = false;

function tryRegisterMontserrat(): string {
  if (montserratRegistered) return "Montserrat";
  try {
    const fontsDir    = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "Montserrat-Regular.ttf");
    const boldPath    = path.join(fontsDir, "Montserrat-Bold.ttf");
    if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) return "Helvetica";
    Font.register({
      family: "Montserrat",
      fonts: [
        { src: regularPath, fontWeight: 400 },
        { src: boldPath,    fontWeight: 700 },
      ],
    });
    montserratRegistered = true;
    return "Montserrat";
  } catch {
    return "Helvetica";
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let overrideEmail: string | null = null;
    let expiryMs = 15 * 24 * 60 * 60 * 1000;
    try {
      const body = await req.json();
      if (body?.email && typeof body.email === "string") overrideEmail = body.email.trim();
      if (body?.expiry && typeof body.expiry === "string") {
        const expiryMap: Record<string, number> = {
          "5d":  5  * 24 * 60 * 60 * 1000,
          "10d": 10 * 24 * 60 * 60 * 1000,
          "15d": 15 * 24 * 60 * 60 * 1000,
        };
        expiryMs = expiryMap[body.expiry] ?? expiryMs;
      }
    } catch { /* no body ok */ }

    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .select(`
        id, enrollment_number, enrollment_date, start_date, end_date, duration_months,
        students!student_id(full_name, dni_nie, birth_date, email, phone, address, province, postal_code),
        courses!course_id(name, duration_hours),
        platforms!platform_id(name),
        contracts!enrollment_id(id, status, amount, payment_type, cash_method, cash_amount, financer, financed_amount)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !enrollment) {
      return Response.json({ error: "Matrícula no encontrada" }, { status: 404 });
    }

    const raw = enrollment as unknown as {
      id: string;
      enrollment_number: number;
      enrollment_date: string;
      start_date: string | null;
      end_date: string | null;
      duration_months: number | null;
      students: { full_name: string; dni_nie: string; birth_date: string | null; email: string; phone: string | null; address: string | null; province: string | null; postal_code: string | null } | null;
      courses: { name: string; duration_hours: number | null } | null;
      platforms: { name: string } | null;
      contracts: Array<{ id: string; status: string; amount: number; payment_type: string | null; cash_method: string | null; cash_amount: number | null; financer: string | null; financed_amount: number | null }>;
    };

    const contract = Array.isArray(raw.contracts) ? raw.contracts[0] ?? null : null;
    if (!contract)    return Response.json({ error: "Sin contrato asociado" }, { status: 400 });
    if (contract.status === "firmado") return Response.json({ error: "El contrato ya está firmado" }, { status: 400 });

    const student = raw.students;
    if (!student) return Response.json({ error: "Alumno no encontrado" }, { status: 400 });
    if (!student.email && !overrideEmail) return Response.json({ error: "El alumno no tiene email registrado" }, { status: 400 });
    const recipientEmail = overrideEmail ?? student.email;

    const fontFamily = tryRegisterMontserrat();
    let logoBase64: string | null = null;
    try {
      logoBase64 = fs.readFileSync(path.join(process.cwd(), "public", "esmera-logo.png")).toString("base64");
    } catch { /* logo opcional */ }

    const contractData: EnrollmentContractData = {
      enrollment_number: raw.enrollment_number,
      enrollment_date:   raw.enrollment_date,
      start_date:        raw.start_date,
      end_date:          raw.end_date,
      duration_months:   raw.duration_months,
      student,
      course:            raw.courses ?? null,
      platform:          raw.platforms?.name ?? null,
      contract: {
        amount:          contract.amount,
        payment_type:    contract.payment_type,
        cash_method:     contract.cash_method,
        cash_amount:     contract.cash_amount,
        financer:        contract.financer,
        financed_amount: contract.financed_amount,
      },
      generatedAt: new Date().toISOString(),
      logoBase64,
      fontFamily,
    };

    const pdfBuffer = await renderToBuffer(<EnrollmentContractPDF data={contractData} />);
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    const apiKey = process.env.DOCUSEAL_API_KEY;
    if (!apiKey) return Response.json({ error: "DocuSeal no configurado" }, { status: 500 });

    const docusealRes = await fetch("https://api.docuseal.eu/submissions/pdf", {
      method: "POST",
      headers: {
        "X-Auth-Token":  apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrato matrícula #${raw.enrollment_number} — ${student.full_name}`,
        documents: [{
          name: "Contrato de matrícula",
          file: base64Pdf,
          fields: [{
            name:     "Firma del alumno",
            type:     "signature",
            role:     "Alumno",
            required: true,
            areas: [{
              x: 0.087,
              y: 0.49,
              w: 0.41,
              h: 0.06,
              page: 3,
            }],
          }],
        }],
        expire_at: new Date(Date.now() + expiryMs).toISOString(),
        submitters: [{
          name:        student.full_name,
          email:       recipientEmail,
          role:        "Alumno",
          external_id: id,
        }],
        message: {
          subject: `Firma tu contrato de matrícula — ${raw.courses?.name ?? "Esmera Online"}`,
          body:    `Hola ${student.full_name},\n\nTe enviamos el contrato de tu matrícula en Esmera Online para que lo revises y firmes digitalmente.\n\nPulsa el siguiente enlace para acceder al documento:\n\n{{submitter.link}}\n\nSi tienes cualquier duda, contáctanos en info@esmeraonline.com.\n\nEsmera Online`,
        },
      }),
    });

    if (!docusealRes.ok) {
      const errText = await docusealRes.text();
      console.error("[send-for-signature] DocuSeal error:", docusealRes.status, errText);
      return Response.json({ error: `DocuSeal ${docusealRes.status}: ${errText}` }, { status: 502 });
    }

    const docusealData  = await docusealRes.json();
    const submissionId  = String(docusealData.id);
    const signingUrl: string | null = docusealData.submitters?.[0]?.embed_src ?? null;

    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = adminClient as any;

    const { error: updateError } = await db
      .from("contracts")
      .update({ status: "enviado", docuseal_submission_id: submissionId, docuseal_signing_url: signingUrl, sent_at: new Date().toISOString(), declined_at: null })
      .eq("id", contract.id);

    if (updateError) {
      console.error("[send-for-signature] DB update error:", updateError);
      return Response.json({ error: "Error al actualizar el estado del contrato" }, { status: 500 });
    }

    await db.from("contract_events")
      .insert({ contract_id: contract.id, enrollment_id: id, event_type: "sent", email: recipientEmail });

    revalidatePath(`/enrollments/${id}`);
    revalidatePath("/enrollments");

    return Response.json({ success: true, signingUrl });
  } catch (err) {
    console.error("[send-for-signature] Error:", err);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
