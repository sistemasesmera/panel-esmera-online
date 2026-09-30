-- ============================================================
-- Esmera Online Panel — Schema inicial
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Tabla de usuarios (perfil público de auth.users) ─────────
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  role          text not null default 'setter'
                  check (role in ('setter','closer','administracion','tutor')),
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

-- Sincronizar email desde auth.users al crear
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'setter')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Plataformas / Sedes ───────────────────────────────────────
create table public.platforms (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.platforms (name) values
  ('Esmera Online'),
  ('Esmera School');

-- ── Cursos ────────────────────────────────────────────────────
create table public.courses (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text,
  duration_hours  numeric,
  price           numeric(10,2),
  active          boolean not null default true,
  stripe_price_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- ── Alumnos ───────────────────────────────────────────────────
create table public.students (
  id           uuid primary key default uuid_generate_v4(),
  full_name    text not null,
  email        text not null,
  phone        text,
  dni_nie      text,
  birth_date   date,
  address      text,
  province     text,
  postal_code  text,
  assigned_to  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  deleted_at   timestamptz
);

create index students_email_idx on public.students(email);
create index students_phone_idx on public.students(phone);

-- ── Matrículas ────────────────────────────────────────────────
create sequence public.enrollment_number_seq start 1000;

create table public.enrollments (
  id                uuid primary key default uuid_generate_v4(),
  enrollment_number integer not null default nextval('enrollment_number_seq'),
  student_id        uuid not null references public.students(id) on delete restrict,
  course_id         uuid not null references public.courses(id) on delete restrict,
  platform_id       uuid references public.platforms(id) on delete set null,
  status            text not null default 'pendiente'
                      check (status in ('pendiente','validada','activa','finalizada','cancelada')),
  enrollment_date   date not null default current_date,
  start_date        date,
  end_date          date,
  duration_months   integer,
  assigned_to       uuid references public.users(id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  deleted_at        timestamptz
);

create index enrollments_student_idx on public.enrollments(student_id);
create index enrollments_status_idx  on public.enrollments(status);

-- ── Contratos ─────────────────────────────────────────────────
create table public.contracts (
  id                       uuid primary key default uuid_generate_v4(),
  enrollment_id            uuid not null references public.enrollments(id) on delete cascade,
  status                   text not null default 'borrador'
                             check (status in ('borrador','enviado','firmado')),
  amount                   numeric(10,2) not null default 0,
  payment_type             text check (payment_type in ('contado','financiado','mixto')),
  cash_method              text,
  cash_amount              numeric(10,2),
  financer                 text,
  financed_amount          numeric(10,2),
  docuseal_submission_id   text,
  docuseal_signing_url     text,
  document_url             text,
  sent_at                  timestamptz,
  signed_at                timestamptz,
  declined_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz
);

create index contracts_enrollment_idx    on public.contracts(enrollment_id);
create index contracts_docuseal_sub_idx  on public.contracts(docuseal_submission_id);

-- ── Eventos de contrato ───────────────────────────────────────
create table public.contract_events (
  id             uuid primary key default uuid_generate_v4(),
  contract_id    uuid not null references public.contracts(id) on delete cascade,
  enrollment_id  uuid references public.enrollments(id) on delete set null,
  event_type     text not null,   -- sent | signed | declined | expired | cancelled
  email          text,
  occurred_at    timestamptz not null default now(),
  decline_reason text
);

-- ── Certificados ──────────────────────────────────────────────
create table public.certificates (
  id            uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  status        text not null default 'pendiente'
                  check (status in ('pendiente','emitido')),
  issued_at     timestamptz,
  document_url  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

-- ── Tutorías ──────────────────────────────────────────────────
create table public.tutoring_sessions (
  id               uuid primary key default uuid_generate_v4(),
  enrollment_id    uuid not null references public.enrollments(id) on delete cascade,
  tutor_id         uuid not null references public.users(id) on delete restrict,
  session_date     date not null,
  contact_type     text not null default 'escrito'
                     check (contact_type in ('escrito','llamada','videollamada','presencial')),
  notes            text,
  duration_minutes integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create index tutoring_enrollment_idx on public.tutoring_sessions(enrollment_id);
create index tutoring_tutor_idx      on public.tutoring_sessions(tutor_id);

-- ── Logs de actividad ─────────────────────────────────────────
create table public.activity_logs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.users(id) on delete set null,
  action       text not null,
  entity_type  text,   -- lead | student | enrollment | contract | certificate | user
  entity_id    uuid,
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index activity_logs_user_idx   on public.activity_logs(user_id);
create index activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);
create index activity_logs_created_idx on public.activity_logs(created_at desc);

-- ── Adjuntos (storage bucket) ─────────────────────────────────
-- Crear el bucket desde el dashboard o con esta query:
insert into storage.buckets (id, name, public)
values ('adjuntos', 'adjuntos', false)
on conflict (id) do nothing;

-- ── RLS — activar en todas las tablas ────────────────────────
alter table public.users               enable row level security;
alter table public.platforms           enable row level security;
alter table public.courses             enable row level security;
alter table public.students            enable row level security;
alter table public.enrollments         enable row level security;
alter table public.contracts           enable row level security;
alter table public.contract_events     enable row level security;
alter table public.certificates        enable row level security;
alter table public.tutoring_sessions   enable row level security;
alter table public.activity_logs       enable row level security;

-- Política base: el service_role bypasea RLS automáticamente.
-- El frontend usa anon key → solo lectura si el usuario está autenticado.

-- usuarios autenticados pueden leer todo (el control fino lo hace el servidor)
create policy "auth_read_users"             on public.users             for select using (auth.role() = 'authenticated');
create policy "auth_read_platforms"         on public.platforms         for select using (auth.role() = 'authenticated');
create policy "auth_read_courses"           on public.courses           for select using (auth.role() = 'authenticated');
create policy "auth_read_students"          on public.students          for select using (auth.role() = 'authenticated');
create policy "auth_read_enrollments"       on public.enrollments       for select using (auth.role() = 'authenticated');
create policy "auth_read_contracts"         on public.contracts         for select using (auth.role() = 'authenticated');
create policy "auth_read_contract_events"   on public.contract_events   for select using (auth.role() = 'authenticated');
create policy "auth_read_certificates"      on public.certificates      for select using (auth.role() = 'authenticated');
create policy "auth_read_tutoring"          on public.tutoring_sessions for select using (auth.role() = 'authenticated');
create policy "auth_read_logs"              on public.activity_logs     for select using (auth.role() = 'authenticated');
