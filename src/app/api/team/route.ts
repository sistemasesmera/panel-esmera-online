import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = req.nextUrl.searchParams.get("role");

  const db = createAdminClient() as any;
  let query = db
    .from("users")
    .select("id, full_name, role")
    .order("full_name", { ascending: true });

  if (role === "setter" || role === "closer") {
    query = query.in("role", [role, "administracion"]);
  } else {
    query = query.in("role", ["setter", "closer", "administracion"]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
