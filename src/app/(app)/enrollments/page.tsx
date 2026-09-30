import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { listEnrollments } from "@/lib/data/enrollments.repository";
import { EnrollmentsTable } from "@/components/features/enrollments/enrollments-table";

export const metadata: Metadata = { title: "Matrículas" };

export default async function EnrollmentsPage() {
  await requireCapability("manageEnrollments");
  const enrollments = await listEnrollments();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Matrículas</h1>
        <p className="text-sm text-muted-foreground mt-1">{enrollments.length} matrículas en total</p>
      </div>
      <EnrollmentsTable enrollments={enrollments} />
    </div>
  );
}
