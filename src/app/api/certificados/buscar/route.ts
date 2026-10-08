import { NextRequest, NextResponse } from "next/server";
import { searchPublicCertificates } from "@/lib/data/certificates.repository";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([], { headers: CORS_HEADERS });
  }

  const results = await searchPublicCertificates(q);

  return NextResponse.json(
    results.map(c => ({
      certificate_number: c.certificate_number,
      student_name:       c.student_name,
      course_name:        c.course_name,
      issued_at:          c.issued_at,
    })),
    { headers: CORS_HEADERS }
  );
}
