import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormationCourse = {
  course_id: string;
  position:  number;
  course:    { id: string; name: string };
};

export type Formation = {
  id:         string;
  name:       string;
  created_at: string;
  courses:    FormationCourse[];
};

export async function listFormations(): Promise<Formation[]> {
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("formations")
    .select("id, name, created_at, formation_courses(course_id, position, courses(id, name))")
    .order("name");
  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((f: any) => ({
    id:         f.id,
    name:       f.name,
    created_at: f.created_at,
    courses: ((f.formation_courses ?? []) as any[])
      .sort((a: any, b: any) => a.position - b.position)
      .map((fc: any) => ({
        course_id: fc.course_id,
        position:  fc.position,
        course:    fc.courses,
      })),
  }));
}
