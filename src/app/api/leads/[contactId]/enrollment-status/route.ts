import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type EnrollmentStatusResponse =
  | { enrolled: false }
  | { enrolled: true; enrollmentId: string; enrollmentNumber: number; studentId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { contactId } = await params;
  const db = createAdminClient() as any;

  // 1. Check by ghl_opportunity_id (most direct: this opp was enrolled)
  const oppId = req.nextUrl.searchParams.get("oppId");
  if (oppId) {
    const { data: byOpp } = await db
      .from("enrollments")
      .select("id, enrollment_number, student_id")
      .eq("ghl_opportunity_id", oppId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (byOpp) {
      return NextResponse.json({
        enrolled:         true,
        enrollmentId:     byOpp.id,
        enrollmentNumber: byOpp.enrollment_number,
        studentId:        byOpp.student_id,
      });
    }
  }

  // 2. Check by student linked to this contact
  const { data: student } = await db
    .from("students")
    .select("id")
    .eq("ghl_contact_id", contactId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (student) {
    const { data: enrollment } = await db
      .from("enrollments")
      .select("id, enrollment_number, student_id")
      .eq("student_id", student.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollment) {
      return NextResponse.json({
        enrolled:         true,
        enrollmentId:     enrollment.id,
        enrollmentNumber: enrollment.enrollment_number,
        studentId:        enrollment.student_id,
      });
    }
  }

  return NextResponse.json({ enrolled: false });
}
