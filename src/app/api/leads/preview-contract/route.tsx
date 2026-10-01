import React from "react";
import fs from "fs";
import path from "path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      contactId:     string;
      name:          string;
      email:         string;
      phone?:        string | null;
      courseId:      string;
      amount:        number;
      paymentType:   "contado" | "financiado";
      paymentOption: string;
    };

    const { contactId, name, email, phone, courseId, amount, paymentType, paymentOption } = body;
    if (!contactId || !name || !courseId || !amount || !paymentType || !paymentOption) {
      return Response.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const db = createAdminClient() as any;

    // Fetch course
    const { data: course } = await db
      .from("courses")
      .select("name, duration_hours")
      .eq("id", courseId)
      .maybeSingle();

    // Fetch lead profile for DNI
    const { data: profile } = await db
      .from("lead_profiles")
      .select("dni")
      .eq("ghl_contact_id", contactId)
      .maybeSingle();

    const fontFamily = tryRegisterMontserrat();
    let logoBase64: string | null = null;
    try {
      logoBase64 = fs.readFileSync(path.join(process.cwd(), "public", "esmera-logo.png")).toString("base64");
    } catch { /* logo opcional */ }

    const contractData: EnrollmentContractData = {
      enrollment_number: null,
      enrollment_date:   new Date().toISOString(),
      start_date:        null,
      end_date:          null,
      duration_months:   null,
      student: {
        full_name:   name,
        dni_nie:     profile?.dni ?? "",
        birth_date:  null,
        address:     null,
        postal_code: null,
        province:    null,
        phone:       phone ?? null,
        email:       email,
      },
      course:    course ?? null,
      formation: null,
      platform:  null,
      contract: {
        amount,
        payment_type:    paymentType,
        cash_method:     paymentType === "contado"    ? paymentOption : null,
        cash_amount:     paymentType === "contado"    ? amount        : null,
        financer:        paymentType === "financiado" ? paymentOption : null,
        financed_amount: paymentType === "financiado" ? amount        : null,
      },
      generatedAt: new Date().toISOString(),
      logoBase64,
      fontFamily,
    };

    const pdfBuffer = await renderToBuffer(<EnrollmentContractPDF data={contractData} />);
    const nodeBuffer = Buffer.from(pdfBuffer);

    const safeName = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
    return new Response(nodeBuffer, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="simulacion-contrato-${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[preview-contract]", err);
    return Response.json({ error: "Error al generar el PDF" }, { status: 500 });
  }
}
