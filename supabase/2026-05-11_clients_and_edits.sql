-- ============================================================
-- MERCAMAYOR — Migración 2026-05-11
-- Aplicar en: Supabase Dashboard > SQL Editor (proyecto dbfkrqxvaapoqgcocrnj)
--
-- Agrega:
--   1. mm_clients (catálogo de clientes con RIF)
--   2. mm_orders.client_id FK opcional → mm_clients
-- ============================================================

-- 1. Tabla de clientes
CREATE TABLE IF NOT EXISTS mm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rif text,
  address text,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS deshabilitado (consistencia con mm_profiles / mm_products)
ALTER TABLE mm_clients DISABLE ROW LEVEL SECURITY;
GRANT ALL ON mm_clients TO authenticated;
GRANT SELECT ON mm_clients TO anon;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS mm_clients_rif_unique
  ON mm_clients(rif) WHERE rif IS NOT NULL;
CREATE INDEX IF NOT EXISTS mm_clients_name_idx ON mm_clients(name);

-- 2. FK opcional en mm_orders
ALTER TABLE mm_orders ADD COLUMN IF NOT EXISTS client_id uuid
  REFERENCES mm_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mm_orders_client_id_idx ON mm_orders(client_id);

-- ============================================================
-- Verificación
-- ============================================================
-- SELECT * FROM mm_clients LIMIT 1;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'mm_orders' AND column_name = 'client_id';
