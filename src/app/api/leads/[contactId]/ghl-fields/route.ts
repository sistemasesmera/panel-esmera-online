import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { fetchGhlContact } from "@/lib/ghl/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { contactId } = await params;
  if (!contactId) return NextResponse.json([], { status: 400 });

  const contact = await fetchGhlContact(contactId);
  return NextResponse.json(contact?.customFields ?? []);
}
