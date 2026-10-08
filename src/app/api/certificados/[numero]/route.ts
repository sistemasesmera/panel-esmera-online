import { NextRequest, NextResponse } from "next/server";
import { getCertificateByNumber } from "@/lib/data/certificates.repository";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { numero } = await params;

  const cert = await getCertificateByNumber(numero);

  if (!cert) {
    return NextResponse.json({ valid: false, error: "Certificado no encontrado" }, { status: 404 });
  }

  if (!cert.active) {
    return NextResponse.json({ valid: false, error: "Certificado desactivado" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    certificate_number: cert.certificate_number,
    student_name:       cert.student_name,
    course_name:        cert.course_name,
    hours:              cert.hours,
    start_date:         cert.start_date,
    end_date:           cert.end_date,
    issued_at:          cert.issued_at,
  });
}
