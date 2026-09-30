import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NoteType = "llamada" | "no_contesto" | "whatsapp" | "email" | "nota";

export type LeadAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
};

export type LeadNote = {
  id: string;
  ghl_contact_id: string;
  ghl_opportunity_id: string | null;
  type: NoteType;
  content: string;
  created_by_name: string | null;
  created_at: string;
  attachments: LeadAttachment[];
};

export async function getLeadActivity(contactId: string): Promise<LeadNote[]> {
  const db = createAdminClient() as any;

  const { data: notes, error } = await db
    .from("lead_notes")
    .select(`
      id, ghl_contact_id, ghl_opportunity_id, type, content, created_at,
      users ( full_name ),
      lead_attachments ( id, file_name, file_url, file_size, created_at )
    `)
    .eq("ghl_contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (notes ?? []).map((n: any) => ({
    id:                   n.id,
    ghl_contact_id:       n.ghl_contact_id,
    ghl_opportunity_id:   n.ghl_opportunity_id,
    type:                 n.type as NoteType,
    content:              n.content,
    created_by_name:      n.users?.full_name ?? null,
    created_at:           n.created_at,
    attachments:          (n.lead_attachments ?? []) as LeadAttachment[],
  }));
}
