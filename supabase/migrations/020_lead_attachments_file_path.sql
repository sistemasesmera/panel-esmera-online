-- Añadir columna file_path a lead_attachments para permitir borrado en storage
ALTER TABLE lead_attachments
  ADD COLUMN IF NOT EXISTS file_path TEXT;
