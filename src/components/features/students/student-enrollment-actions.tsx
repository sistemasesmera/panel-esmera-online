"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewEnrollmentModal } from "./new-enrollment-modal";

type Course = { id: string; name: string; price: number | null };

export function StudentEnrollmentActions({
  studentId,
  studentName,
  courses,
}: {
  studentId:   string;
  studentName: string;
  courses:     Course[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shrink-0"
      >
        <Plus className="h-4 w-4" />
        Nueva matrícula
      </button>

      {open && (
        <NewEnrollmentModal
          studentId={studentId}
          studentName={studentName}
          courses={courses}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
