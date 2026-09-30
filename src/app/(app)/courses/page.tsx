import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requireCapability } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { CoursesClient } from "@/components/features/courses/courses-client";

export const metadata: Metadata = { title: "Cursos" };

export default async function CoursesPage() {
  await requireCapability("manageCourses");
  const courses = await listCourses();

  return (
    <div>
      <CoursesClient courses={courses} />
    </div>
  );
}
