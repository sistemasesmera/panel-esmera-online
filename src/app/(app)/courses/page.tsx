import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { listFormations } from "@/lib/data/formations.repository";
import { CoursesClient } from "@/components/features/courses/courses-client";

export const metadata: Metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const user = await requireCapability("viewCourses");
  const [courses, formations] = await Promise.all([listCourses(), listFormations()]);

  return (
    <div>
      <CoursesClient courses={courses} formations={formations} readOnly={user.role !== "administracion"} />
    </div>
  );
}
