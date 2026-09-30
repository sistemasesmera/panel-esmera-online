import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getLeadProfile } from "@/lib/data/lead-profiles.repository";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { contactId } = await params;
  if (!contactId) return NextResponse.json({ error: "contactId requerido" }, { status: 400 });

  try {
    const profile = await getLeadProfile(contactId);
    return NextResponse.json(profile ?? {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
