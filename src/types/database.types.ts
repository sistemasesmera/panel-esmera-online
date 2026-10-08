// Generado por: supabase gen types typescript --project-id <id>
// Actualizar con: npx supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
          email: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      leads: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          status: string;
          assigned_to: string | null;
          source: string | null;
          course_interest: string | null;
          notes: string | null;
          ghl_contact_id: string | null;
          ghl_opportunity_id: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      students: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          dni_nie: string | null;
          birth_date: string | null;
          address: string | null;
          province: string | null;
          postal_code: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["students"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      courses: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          duration_hours: number | null;
          price: number | null;
          active: boolean;
          stripe_price_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["courses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
      };
      enrollments: {
        Row: {
          id: string;
          enrollment_number: number;
          student_id: string;
          course_id: string;
          platform_id: string | null;
          status: string;
          enrollment_date: string;
          start_date: string | null;
          end_date: string | null;
          duration_months: number | null;
          assigned_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["enrollments"]["Row"], "id" | "created_at" | "enrollment_number">;
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Insert"]>;
      };
      contracts: {
        Row: {
          id: string;
          enrollment_id: string;
          status: string;
          amount: number;
          payment_type: string | null;
          cash_method: string | null;
          cash_amount: number | null;
          financer: string | null;
          financed_amount: number | null;
          docuseal_submission_id: string | null;
          docuseal_signing_url: string | null;
          document_url: string | null;
          sent_at: string | null;
          signed_at: string | null;
          declined_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["contracts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["contracts"]["Insert"]>;
      };
      contract_events: {
        Row: {
          id: string;
          contract_id: string;
          enrollment_id: string | null;
          event_type: string;
          email: string | null;
          occurred_at: string;
          decline_reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["contract_events"]["Row"], "id" | "occurred_at">;
        Update: Partial<Database["public"]["Tables"]["contract_events"]["Insert"]>;
      };
      certificates: {
        Row: {
          id: string;
          enrollment_id: string;
          certificate_number: string | null;
          student_name: string | null;
          course_name: string | null;
          hours: number | null;
          start_date: string | null;
          end_date: string | null;
          active: boolean;
          status: string;
          issued_at: string | null;
          document_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["certificates"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["certificates"]["Insert"]>;
      };
      tutoring_sessions: {
        Row: {
          id: string;
          enrollment_id: string;
          tutor_id: string;
          session_date: string;
          contact_type: string;
          notes: string | null;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["tutoring_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tutoring_sessions"]["Insert"]>;
      };
      platforms: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["platforms"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["platforms"]["Insert"]>;
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
