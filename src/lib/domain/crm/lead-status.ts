export const LOST_REASONS = [
  { value: "no_interesado",     label: "No está interesado" },
  { value: "otra_academia",     label: "Eligió otra academia" },
  { value: "no_ve_valor",       label: "No ve valor en el curso" },
  { value: "precio_elevado",    label: "Precio elevado" },
  { value: "quiere_presencial", label: "Quiere presencial" },
] as const;

export type LostReason = (typeof LOST_REASONS)[number]["value"];

export const UNQUALIFIED_REASONS = [
  { value: "quiere_gratis", label: "Lo quiere gratis (subvencionado)" },
] as const;

export type UnqualifiedReason = (typeof UNQUALIFIED_REASONS)[number]["value"];
