import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { listStudents, listStudentsForUser } from "@/lib/data/students.repository";
import { StudentsTable } from "@/components/features/students/students-table";

export const metadata: Metadata = { title: "Alumnos" };

export default async function StudentsPage() {
  const user = await requireCapability("viewStudents");
  const isAdmin = user.role === "administracion" || user.role === "tutor";
  const students = isAdmin
    ? await listStudents()
    : await listStudentsForUser(user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Alumnos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Directorio completo de alumnos registrados" : `${students.length} alumnos asignados a ti`}
          </p>
        </div>
      </div>
      <StudentsTable students={students} />
    </div>
  );
}
