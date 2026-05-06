-- ============================================================
-- MERCAMAYOR — SEED SQL
-- Run this after creating the schema tables + RLS
-- ============================================================

-- Products seed
INSERT INTO mm_products (code, name, unit) VALUES
  ('PT01TULI18LT',    'OLEINA C. DE PALMA TULIPAN 18LT',           'unidad'),
  ('7593385001210M',  'OLEINA C. DE PALMA DE PRIMERA 18LT',         'unidad'),
  ('7593385001005',   'ACEITE RBD DE PALMA DE PRIMERA 18LT',        'unidad'),
  ('7593385001142-2', 'ACEITE VEGETAL DE PRIMERA SOYA 18LT',        'unidad'),
  ('7591659001041',   'MARGARINA LA RENDIDORA SIN SAL 5 KG',        'unidad'),
  ('7591659001058',   'MARGARINA LA RENDIDORA CON SAL 5 KG',        'unidad'),
  ('7598819000067',   'ACEITE VEGETAL TULIPAN 12X750ML',            'unidad'),
  ('7598819000043',   'ACEITE VEGETAL TULIPAN 20X500ML',            'unidad'),
  ('7591659001379',   'UNTABLE MARGARINA LA RENDIDORA 12X400GRS',   'unidad'),
  ('7599271000039',   'MANTECA VEGETAL KEY 5KGS',                   'unidad'),
  ('100137',          'MANTECA VEGETAL LA RENDIDORA 5KGS',          'unidad'),
  ('7591655900037',   'MAYONESA LA RENDIDORA 12X445GRS',            'unidad')
ON CONFLICT (code) DO NOTHING;
