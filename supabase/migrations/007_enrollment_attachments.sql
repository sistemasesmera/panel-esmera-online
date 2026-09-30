-- Bucket: "enrollment-files" (se crea automáticamente desde el server action)
-- ── Adjuntos de matrícula ─────────────────────────────────────

create table if not exists public.enrollment_attachments (
  id            uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  file_name     text not null,
  file_path     text not null,
  file_size     bigint,
  uploaded_by   uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists enrollment_attachments_idx on public.enrollment_attachments(enrollment_id);

alter table public.enrollment_attachments enable row level security;

create policy "auth_read_enrollment_attachments"
  on public.enrollment_attachments for select
  using (auth.role() = 'authenticated');
