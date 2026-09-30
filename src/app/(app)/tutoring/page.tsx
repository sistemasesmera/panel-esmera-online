import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import {
  listTutoringSessions,
  getActiveEnrollmentsForTutor,
} from "@/lib/data/tutoring.repository";
import { TutoringClient } from "@/components/features/tutoring/tutoring-client";

export const metadata: Metadata = { title: "Tutorías" };

export default async function TutoringPage() {
  const user = await requireCapability("viewTutoring");
  const isAdmin = user.role === "administracion";

  const [enrollments, sessions] = await Promise.all([
    getActiveEnrollmentsForTutor(isAdmin ? undefined : user.id),
    listTutoringSessions(isAdmin ? undefined : user.id),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Tutorías</h1>
        <p className="text-sm text-muted-foreground mt-1">{sessions.length} sesiones registradas</p>
      </div>
      <TutoringClient
        enrollments={enrollments}
        sessions={sessions}
        isAdmin={isAdmin}
      />
    </div>
  );
}
