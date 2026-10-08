import { NextRequest, NextResponse } from "next/server";
import { getCertificateByNumber } from "@/lib/data/certificates.repository";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "https://www.esmeraonline.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { numero } = await params;

  const cert = await getCertificateByNumber(numero);

  if (!cert) {
    return NextResponse.json(
      { valid: false, error: "Certificado no encontrado" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  if (!cert.active) {
    return NextResponse.json(
      { valid: false, error: "Certificado desactivado" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    {
      valid:              true,
      certificate_number: cert.certificate_number,
      student_name:       cert.student_name,
      course_name:        cert.course_name,
      hours:              cert.hours,
      start_date:         cert.start_date,
      end_date:           cert.end_date,
      issued_at:          cert.issued_at,
    },
    { headers: CORS_HEADERS }
  );
}
