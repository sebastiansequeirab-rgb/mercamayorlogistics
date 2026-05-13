-- ============================================================
-- MERCAMAYOR — v3: Allocations granulares por ítem
-- 2026-05-12
-- ============================================================
-- Cambio: una orden conserva su cantidad pedida intacta.
-- Lo que físicamente va en el camión se registra en mm_shipment_items.
-- Una misma orden puede repartirse en varios camiones.
-- ============================================================

CREATE TABLE IF NOT EXISTS mm_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES mm_shipments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES mm_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES mm_products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (shipment_id, order_id, product_id)
);

CREATE INDEX IF NOT EXISTS mm_shipment_items_shipment_idx ON mm_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS mm_shipment_items_order_idx    ON mm_shipment_items(order_id);

-- RLS off (mismo patrón que el resto — el frontend asume auth contra mm_profiles)
ALTER TABLE mm_shipment_items DISABLE ROW LEVEL SECURITY;
GRANT ALL ON mm_shipment_items TO authenticated;
GRANT SELECT ON mm_shipment_items TO anon;

-- ============================================================
-- Verificación
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'mm_shipment_items' ORDER BY ordinal_position;
-- SELECT relrowsecurity FROM pg_class WHERE relname='mm_shipment_items';  -- f
