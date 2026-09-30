import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { listStudents } from "@/lib/data/students.repository";
import { StudentsTable } from "@/components/features/students/students-table";

export const metadata: Metadata = { title: "Alumnos" };

export default async function StudentsPage() {
  await requireCapability("manageStudents");
  const students = await listStudents();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Alumnos</h1>
          <p className="text-sm text-muted-foreground mt-1">Directorio completo de alumnos registrados</p>
        </div>
      </div>
      <StudentsTable students={students} />
    </div>
  );
}
