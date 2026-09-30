@AGENTS.md

# Esmera Online Panel — CRM

CRM interno de Esmera Online sobre Next.js 16 + React 19 + Supabase + Tailwind v4.

## Stack

- **Framework:** Next.js 16 (App Router, src/ dir)
- **UI:** Tailwind v4, shadcn/ui (radix-ui), lucide-react
- **DB/Auth:** Supabase (SSR) — proyecto nuevo, migración progresiva desde esmera-online-manager
- **Formularios:** react-hook-form + zod
- **PDF:** @react-pdf/renderer
- **Firma digital:** DocuSeal (`https://api.docuseal.eu`)
- **CRM externo:** GoHighLevel (GHL) API v2021-04-15
- **Pagos:** Stripe

## Estructura

```
src/
  app/
    (auth)/          — login
    (app)/           — rutas protegidas (layout con sidebar)
      dashboard/
      crm/
        pipeline/    — Kanban GHL (setter/closer zones)
        leads/       — leads internos
      students/
      enrollments/   — matrículas + contratos + firma
      courses/
      certificates/
      tutoring/      — tutorías (rol tutor)
      logs/
      admin/         — usuarios, configuración
    api/
      webhooks/docuseal/
      webhooks/stripe/
      enrollments/[id]/send-for-signature/
      public/leads/
  components/
    ui/              — shadcn primitives
    features/        — componentes por módulo
  lib/
    auth/
    data/            — repositorios (server-only)
    domain/          — schemas zod + tipos de dominio
    ghl/api.ts       — cliente GoHighLevel
    pdf/             — plantillas PDF
    supabase/        — admin / client / server / middleware
    utils/
  hooks/
  types/
    database.types.ts
```

## Roles

| Rol | Acceso |
|---|---|
| `setter` | Pipeline zona setter, sus leads, métricas propias |
| `closer` | Pipeline zona closer, sus oportunidades, métricas de cierre |
| `administracion` | Todo — pipeline completo, matrículas, contratos, alumnos, finanzas |
| `tutor` | Sus alumnos activos, registro de tutorías |

## Pipeline GHL

Un solo pipeline con dos zonas:
- **Setter:** Nuevo → Contactado → Cualificado → Cita agendada
- **Closer:** Cita confirmada → En negociación → Propuesta enviada → Ganado / Perdido

El traspaso es automático por etapa (el closer ve desde "Cita confirmada").

## Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GHL_API_KEY=
GHL_LOCATION_ID=
GHL_WEBHOOK_TOKEN=
GHL_CURSO_FIELD_ID=
DOCUSEAL_API_KEY=
DOCUSEAL_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Convenciones

- Server actions en `actions.ts` junto a cada `page.tsx`
- Repositorios en `lib/data/*.repository.ts` (server-only)
- Schemas zod en `lib/domain/*/schema.ts`
- Componentes cliente en `components/features/*/`
- Un `loading.tsx` por ruta con datos pesados
- Tipos generados por Supabase en `types/database.types.ts`
