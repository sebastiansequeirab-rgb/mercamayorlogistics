-- ============================================================
-- MERCAMAYOR — SCHEMA SQL (tablas con prefijo mm_)
-- Pega esto en el SQL Editor del proyecto dbfkrqxvaapoqgcocrnj
-- ============================================================

-- 1. MM_PROFILES (extiende auth.users)
CREATE TABLE mm_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestora', 'vendedor')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: auto-crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION mm_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo inserta si el metadata incluye 'role' (usuarios de Mercamayor)
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO mm_profiles (id, full_name, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'role'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mm_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION mm_handle_new_user();

-- 2. MM_PRODUCTS
CREATE TABLE mm_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidad',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MM_SHIPMENTS
CREATE TABLE mm_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number BIGINT GENERATED ALWAYS AS IDENTITY,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'programado' CHECK (status IN ('programado', 'en_camino', 'entregado')),
  notes TEXT,
  created_by UUID REFERENCES mm_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MM_ORDERS
CREATE TABLE mm_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGINT GENERATED ALWAYS AS IDENTITY,
  created_by UUID NOT NULL REFERENCES mm_profiles(id),
  vendor_client TEXT NOT NULL,
  price_list TEXT NOT NULL CHECK (price_list IN (
    'lista_50_mm','lista_60_mm',
    'lista_a_albeca','lista_b_albeca','lista_c_albeca',
    'lista_a_ioseca','lista_b_ioseca'
  )),
  billing_type TEXT NOT NULL CHECK (billing_type IN ('factura', 'nota_de_entrega')),
  status TEXT NOT NULL DEFAULT 'recibido' CHECK (status IN ('recibido', 'en_transito', 'entregado')),
  shipment_id UUID REFERENCES mm_shipments(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- Trigger: auto-actualizar updated_at
CREATE OR REPLACE FUNCTION mm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mm_orders_updated_at
  BEFORE UPDATE ON mm_orders
  FOR EACH ROW EXECUTE FUNCTION mm_update_updated_at();

-- 5. MM_ORDER_ITEMS
CREATE TABLE mm_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mm_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES mm_products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 5b. MM_SHIPMENT_ITEMS — allocations granulares (qué cantidad de cada item va en cada camión).
--     La orden conserva su cantidad pedida intacta en mm_order_items.
CREATE TABLE mm_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES mm_shipments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES mm_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES mm_products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (shipment_id, order_id, product_id)
);

-- 6. MM_ORDER_COMMENTS
CREATE TABLE mm_order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mm_orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES mm_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE mm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mm_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mm_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mm_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mm_products ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION mm_get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM mm_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- MM_PRODUCTS: todos leen; admin/gestora escriben
CREATE POLICY "mm_products_read" ON mm_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "mm_products_write" ON mm_products FOR ALL TO authenticated
  USING (mm_get_user_role() IN ('admin', 'gestora'));

-- MM_ORDERS: vendedores ven los suyos; admin/gestora ven todos
CREATE POLICY "mm_orders_select" ON mm_orders FOR SELECT TO authenticated
  USING (mm_get_user_role() IN ('admin', 'gestora') OR created_by = auth.uid());
CREATE POLICY "mm_orders_insert" ON mm_orders FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "mm_orders_update" ON mm_orders FOR UPDATE TO authenticated
  USING (mm_get_user_role() IN ('admin', 'gestora'));

-- MM_ORDER_ITEMS
CREATE POLICY "mm_items_select" ON mm_order_items FOR SELECT TO authenticated
  USING (
    mm_get_user_role() IN ('admin', 'gestora') OR
    EXISTS (SELECT 1 FROM mm_orders WHERE mm_orders.id = mm_order_items.order_id AND mm_orders.created_by = auth.uid())
  );
CREATE POLICY "mm_items_insert" ON mm_order_items FOR INSERT TO authenticated WITH CHECK (true);

-- MM_ORDER_COMMENTS
CREATE POLICY "mm_comments_select" ON mm_order_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "mm_comments_insert" ON mm_order_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- MM_SHIPMENTS: solo admin y gestora
CREATE POLICY "mm_shipments_all" ON mm_shipments FOR ALL TO authenticated
  USING (mm_get_user_role() IN ('admin', 'gestora'));

-- MM_PROFILES: cada usuario ve el suyo; admin/gestora ven todos
CREATE POLICY "mm_profiles_select" ON mm_profiles FOR SELECT TO authenticated
  USING (mm_get_user_role() IN ('admin', 'gestora') OR id = auth.uid());
