import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { listEnrollments, listEnrollmentsForUser, listEnrollmentsForTutor } from "@/lib/data/enrollments.repository";
import { EnrollmentsTable } from "@/components/features/enrollments/enrollments-table";

export const metadata: Metadata = { title: "Matrículas" };

export default async function EnrollmentsPage() {
  const user = await requireCapability("viewEnrollments");
  const isAdmin = user.role === "administracion";
  const isTutor = user.role === "tutor";
  const enrollments = isAdmin
    ? await listEnrollments()
    : isTutor
      ? await listEnrollmentsForTutor(user.id)
      : await listEnrollmentsForUser(user.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Matrículas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
          ? `${enrollments.length} matrículas en total`
          : isTutor
            ? `${enrollments.length} matrículas tutorizadas por ti`
            : `${enrollments.length} matrículas asignadas a ti`}
        </p>
      </div>
      <EnrollmentsTable enrollments={enrollments} />
    </div>
  );
}
