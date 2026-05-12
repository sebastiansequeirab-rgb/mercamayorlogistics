-- ============================================================
-- MERCAMAYOR — Seed de 10 pedidos de prueba aleatorios
-- Cada pedido tiene 5-8 SKUs con cantidades aleatorias (1-30 u).
-- Asignados a clientes al azar de los 75 ya cargados.
-- created_by: el primer usuario activo con rol vendedor (Janet).
--             Si no hay vendedor activo, usa el primer perfil activo.
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
  v_client_id uuid;
  v_client_name text;
  v_product_id uuid;
  v_num_items int;
  v_qty int;
  v_price text;
  v_billing text;
  v_notes text;
  i int;
BEGIN
  -- Vendedor activo (Janet)
  SELECT id INTO v_user_id
  FROM mm_profiles
  WHERE role = 'vendedor' AND active = true
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM mm_profiles WHERE active = true LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No active profiles found in mm_profiles';
  END IF;

  FOR i IN 1..10 LOOP
    -- Cliente aleatorio
    SELECT id, name INTO v_client_id, v_client_name
    FROM mm_clients
    WHERE active = true
    ORDER BY random()
    LIMIT 1;

    -- Atributos aleatorios
    v_price   := CASE WHEN random() < 0.5 THEN 'lista_50' ELSE 'lista_60' END;
    v_billing := CASE WHEN random() < 0.6 THEN 'factura' ELSE 'nota_de_entrega' END;
    v_notes   := CASE WHEN random() < 0.4
                     THEN (ARRAY[
                       'Entregar antes del mediodía',
                       'Cliente paga al recibir',
                       'Confirmar dirección con el chofer',
                       'Pedido urgente',
                       'Llamar al llegar'
                     ])[1 + floor(random() * 5)::int]
                     ELSE NULL
                 END;

    -- Insertar pedido
    INSERT INTO mm_orders (created_by, client_id, vendor_client, price_list, billing_type, status, notes)
    VALUES (v_user_id, v_client_id, v_client_name, v_price, v_billing, 'recibido', v_notes)
    RETURNING id INTO v_order_id;

    -- Cantidad de SKUs: 5..8
    v_num_items := 5 + floor(random() * 4)::int;

    -- Items aleatorios
    FOR v_product_id IN
      SELECT id
      FROM mm_products
      WHERE active = true
      ORDER BY random()
      LIMIT v_num_items
    LOOP
      v_qty := 1 + floor(random() * 30)::int;  -- 1..30
      INSERT INTO mm_order_items (order_id, product_id, quantity)
      VALUES (v_order_id, v_product_id, v_qty);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- Verificación
-- ============================================================
SELECT
  (SELECT count(*) FROM mm_orders WHERE status = 'recibido')  AS pedidos_recibidos,
  (SELECT count(*) FROM mm_order_items)                       AS total_items,
  (SELECT round(avg(c), 2) FROM (
    SELECT count(*) AS c FROM mm_order_items GROUP BY order_id
  ) s)                                                        AS skus_promedio_por_pedido;
