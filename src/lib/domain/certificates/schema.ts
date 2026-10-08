import { z } from "zod";

export const createCertificateSchema = z.object({
  enrollment_id: z.string().uuid("Matrícula inválida"),
  student_name:  z.string().min(1, "Nombre requerido"),
  course_name:   z.string().min(1, "Curso requerido"),
  hours:         z.number().nullable().optional(),
  start_date:    z.string().nullable().optional(),
  end_date:      z.string().nullable().optional(),
});

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
