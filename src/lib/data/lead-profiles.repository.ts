import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Experiencia        = "de_cero" | "algo_de_base" | "experimentado";
export type DispuestoInvertir  = "si" | "no" | "depende";
export type QuienDecide        = "el_ella" | "otra_persona";
export type Temperatura        = "caliente" | "templada" | "fria";

export type LeadProfile = {
  id:                   string;
  ghl_contact_id:       string;
  origen:               string | null;
  pregunta_1:           string | null;
  pregunta_2:           string | null;
  pregunta_3:           string | null;
  dni:                  string | null;
  objetivo:             string | null;
  horas_semana:         string | null;
  cuando_empezar:       string | null;
  experiencia:          Experiencia | null;
  dispuesto_invertir:   DispuestoInvertir | null;
  quien_decide:         QuienDecide | null;
  quien_otra_persona:   string | null;
  dudas_objeciones:     string | null;
  temperatura:          Temperatura | null;
  frase_clave:          string | null;
  curso_interes_id:     string | null;
  curso_interes:        string | null;
  importe_previsto:     number | null;
};

export async function getLeadProfile(contactId: string): Promise<LeadProfile | null> {
  const db = createAdminClient() as any;
  const { data } = await db
    .from("lead_profiles")
    .select("*")
    .eq("ghl_contact_id", contactId)
    .maybeSingle();
  return data ?? null;
}
