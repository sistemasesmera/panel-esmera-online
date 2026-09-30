import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { CoursesClient } from "@/components/features/courses/courses-client";

export const metadata: Metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const user = await requireCapability("viewCourses");
  const courses = await listCourses();

  return (
    <div>
      <CoursesClient courses={courses} readOnly={user.role !== "administracion"} />
    </div>
  );
}
