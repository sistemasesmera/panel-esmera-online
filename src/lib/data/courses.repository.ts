import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Course = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  description: string | null;
  duration_hours: number | null;
  price: number | null;
  active: boolean;
  dossier_url: string | null;
  stripe_price_id: string | null;
  created_at: string;
};

export async function listCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, code, category, description, duration_hours, price, active, dossier_url, stripe_price_id, created_at")
    .order("category", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Course[];
}
