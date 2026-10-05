-- Caché de oportunidades GHL para evitar llamadas síncronas lentas al pipeline
CREATE TABLE IF NOT EXISTS public.ghl_opportunities_cache (
  id                   TEXT PRIMARY KEY,
  pipeline_id          TEXT NOT NULL,
  pipeline_stage_id    TEXT NOT NULL,
  contact_id           TEXT NOT NULL,
  contact_name         TEXT,
  contact_email        TEXT,
  contact_phone        TEXT,
  name                 TEXT,
  status               TEXT NOT NULL DEFAULT 'open',
  monetary_value       NUMERIC,
  custom_fields        JSONB,
  assigned_to          TEXT,
  created_at_ghl       TIMESTAMPTZ,
  updated_at_ghl       TIMESTAMPTZ,
  last_stage_change_at TIMESTAMPTZ,
  synced_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ghl_opp_cache_pipeline
  ON public.ghl_opportunities_cache(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_ghl_opp_cache_stage
  ON public.ghl_opportunities_cache(pipeline_id, pipeline_stage_id);

CREATE INDEX IF NOT EXISTS idx_ghl_opp_cache_synced
  ON public.ghl_opportunities_cache(pipeline_id, synced_at DESC);

-- Estado del último sync por pipeline (lock para evitar syncs concurrentes)
CREATE TABLE IF NOT EXISTS public.ghl_pipeline_sync (
  pipeline_id    TEXT PRIMARY KEY,
  last_sync      TIMESTAMPTZ,
  syncing_since  TIMESTAMPTZ
);
