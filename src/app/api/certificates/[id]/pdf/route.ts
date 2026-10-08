import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCertificatePdf } from "@/lib/pdf/certificate-template";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 401 });
  }

  const { id } = await params;
  const db = createAdminClient() as any;
  const { data: cert, error } = await db
    .from("certificates")
    .select("certificate_number, student_name, course_name, issued_at")
    .eq("id", id)
    .single();

  if (error || !cert) {
    return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
  }

  const doc    = await buildCertificatePdf(cert);
  const buffer = await renderToBuffer(doc);
  const filename = `certificado-${cert.certificate_number}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
