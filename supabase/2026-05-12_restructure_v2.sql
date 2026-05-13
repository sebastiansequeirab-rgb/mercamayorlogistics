-- ============================================================
-- MERCAMAYOR — Reestructura v2 (post-feedback dueños)
-- 2026-05-12
-- ============================================================
-- Cambios:
--   1) TRUNCATE seed (orders, items, comments, shipments) y resetea identity
--   2) price_list: pasa a 7 valores (MM Tradicional 50/60, Albeca A/B/C, Ioseca A/B)
--   3) mm_shipments.name (alias legible del camión, p.ej. "Toyota Blanca")
--   4) Mercamayor como cliente (placeholder; RIF/datos a completar después)
--   5) RLS guard sobre mm_shipments
-- ============================================================

-- 1) Wipe pedidos + camiones de prueba
TRUNCATE TABLE
  mm_order_comments,
  mm_order_items,
  mm_orders,
  mm_shipments
RESTART IDENTITY CASCADE;

-- 2) Listas de precios: 7 valores nuevos
ALTER TABLE mm_orders DROP CONSTRAINT IF EXISTS mm_orders_price_list_check;
ALTER TABLE mm_orders ADD CONSTRAINT mm_orders_price_list_check
  CHECK (price_list IN (
    'lista_50_mm',
    'lista_60_mm',
    'lista_a_albeca',
    'lista_b_albeca',
    'lista_c_albeca',
    'lista_a_ioseca',
    'lista_b_ioseca'
  ));

-- 3) Nombre/alias del camión
ALTER TABLE mm_shipments ADD COLUMN IF NOT EXISTS name TEXT;

-- 4) Mercamayor como cliente (placeholder)
INSERT INTO mm_clients (name, rif, active)
VALUES ('MERCAMAYOR', NULL, true)
ON CONFLICT DO NOTHING;

-- 5) RLS guard sobre mm_shipments (la columna nueva puede re-enabler RLS)
ALTER TABLE mm_shipments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON mm_shipments TO authenticated;
GRANT SELECT ON mm_shipments TO anon;

-- ============================================================
-- Verificación rápida
-- ============================================================
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='mm_orders_price_list_check';
-- SELECT column_name FROM information_schema.columns WHERE table_name='mm_shipments' AND column_name='name';
-- SELECT count(*) FROM mm_orders;     -- 0
-- SELECT count(*) FROM mm_shipments;  -- 0
-- SELECT id, name FROM mm_clients WHERE name='MERCAMAYOR';
-- SELECT relrowsecurity FROM pg_class WHERE relname='mm_shipments';  -- f
