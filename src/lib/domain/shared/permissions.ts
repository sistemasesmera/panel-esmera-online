export const APP_ROLES = ["setter", "closer", "administracion", "tutor"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  setter: "Setter",
  closer: "Closer",
  administracion: "Administración",
  tutor: "Tutor",
};

export const CAPABILITIES = {
  viewPipeline:       ["setter", "closer", "administracion"] as AppRole[],
  viewFullPipeline:   ["administracion"] as AppRole[],
  manageEnrollments:  ["administracion"] as AppRole[],
  manageStudents:     ["administracion", "tutor"] as AppRole[],
  manageCourses:      ["administracion"] as AppRole[],
  viewTutoring:       ["tutor", "administracion"] as AppRole[],
  viewLogs:           ["administracion"] as AppRole[],
  manageUsers:        ["administracion"] as AppRole[],
} as const;

export type Capability = keyof typeof CAPABILITIES;

export function roleHasCapability(role: AppRole, capability: Capability): boolean {
  return (CAPABILITIES[capability] as AppRole[]).includes(role);
}

export const SETTER_STAGES = ["Lead nuevo", "Contactando", "Cualificando", "Cita agendada"];
export const CLOSER_STAGES = ["No asistió", "En seguimiento", "Pago pendiente", "Matriculado", "Perdido", "No cualificado"];
