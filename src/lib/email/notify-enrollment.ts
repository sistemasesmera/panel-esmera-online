import "server-only";
import { sendEnrollmentNotification } from "./enrollment-notification";

export async function notifyEnrollmentSigned(db: any, enrollmentId: string) {
  const { data: enr } = await db
    .from("enrollments")
    .select("enrollment_number, course_id, formation_id, tutor_id, ghl_opportunity_id, students!student_id(full_name)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enr) return;

  const studentName = enr.students?.full_name ?? "Alumno";

  // Base recipients (always in every email)
  const baseEmails = new Set<string>();
  baseEmails.add("info@esmeraonline.com");

  const { data: admins } = await db.from("users").select("email").eq("role", "administracion");
  for (const u of admins ?? []) if (u.email) baseEmails.add(u.email);

  if (enr.ghl_opportunity_id) {
    const { data: lp } = await db.from("lead_profiles").select("setter_id, closer_id").eq("ghl_opportunity_id", enr.ghl_opportunity_id).maybeSingle();
    const ids = [lp?.setter_id, lp?.closer_id].filter(Boolean) as string[];
    if (ids.length) {
      const { data: commercials } = await db.from("users").select("email").in("id", ids);
      for (const u of commercials ?? []) if (u.email) baseEmails.add(u.email);
    }
  }

  // Formation: one email per course with its specific tutor
  if (enr.formation_id) {
    const { data: courseTutors } = await db
      .from("enrollment_course_tutors")
      .select("tutor_id, courses!course_id(name)")
      .eq("enrollment_id", enrollmentId);

    for (const ct of courseTutors ?? []) {
      const courseName = ct.courses?.name ?? "Curso";
      const recipients = new Set(baseEmails);
      if (ct.tutor_id) {
        const { data: tutor } = await db.from("users").select("email").eq("id", ct.tutor_id).maybeSingle();
        if (tutor?.email) recipients.add(tutor.email);
      }
      await sendEnrollmentNotification({ enrollmentNumber: enr.enrollment_number, enrollmentId, studentName, courseName, recipientEmails: [...recipients] });
    }
    return;
  }

  // Single course
  let courseName = "—";
  if (enr.course_id) {
    const { data: c } = await db.from("courses").select("name").eq("id", enr.course_id).maybeSingle();
    if (c?.name) courseName = c.name;
  }
  if (enr.tutor_id) {
    const { data: tutor } = await db.from("users").select("email").eq("id", enr.tutor_id).maybeSingle();
    if (tutor?.email) baseEmails.add(tutor.email);
  }

  await sendEnrollmentNotification({ enrollmentNumber: enr.enrollment_number, enrollmentId, studentName, courseName, recipientEmails: [...baseEmails] });
}
