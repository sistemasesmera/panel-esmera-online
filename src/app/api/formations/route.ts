import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listFormations } from "@/lib/data/formations.repository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const formations = await listFormations();
    return NextResponse.json(formations);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
