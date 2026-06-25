-- ============================================================
--  CONTROL DE DEUDA — Configuración de Supabase (PostgreSQL)
--  Ejecuta todo este script en el SQL Editor de Supabase
-- ============================================================

-- 1. TABLA DE DEUDAS
CREATE TABLE IF NOT EXISTS deudas (
  id SERIAL PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0,
  nombre TEXT NOT NULL DEFAULT 'Mi deuda',
  pin TEXT NOT NULL DEFAULT '1234',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creada_en DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 2. TABLA DE PAGOS
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  monto INTEGER NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto TEXT DEFAULT '',
  registrado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. DEUDA INICIAL (cambia el PIN después desde la app)
INSERT INTO deudas (total, nombre, pin)
VALUES (0, 'Mi deuda', '1234')
ON CONFLICT DO NOTHING;

-- 4. FUNCIÓN: verificar_pin
CREATE OR REPLACE FUNCTION verificar_pin(pin_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM deudas WHERE activa = TRUE AND pin = pin_input
  );
END;
$$;

-- 5. FUNCIÓN: agregar_pago
CREATE OR REPLACE FUNCTION agregar_pago(
  p_monto INTEGER,
  p_fecha DATE,
  p_concepto TEXT DEFAULT '',
  p_pin TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valido BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM deudas WHERE activa = TRUE AND pin = p_pin) INTO v_valido;
  IF NOT v_valido THEN
    RETURN json_build_object('success', FALSE, 'error', 'PIN incorrecto');
  END IF;
  INSERT INTO pagos (monto, fecha, concepto)
  VALUES (p_monto, p_fecha, COALESCE(NULLIF(p_concepto, ''), ''));
  RETURN json_build_object('success', TRUE);
END;
$$;

-- 6. FUNCIÓN: editar_pago
CREATE OR REPLACE FUNCTION editar_pago(
  p_id INTEGER,
  p_monto INTEGER,
  p_fecha DATE,
  p_concepto TEXT DEFAULT '',
  p_pin TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valido BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM deudas WHERE activa = TRUE AND pin = p_pin) INTO v_valido;
  IF NOT v_valido THEN
    RETURN json_build_object('success', FALSE, 'error', 'PIN incorrecto');
  END IF;
  UPDATE pagos SET monto = p_monto, fecha = p_fecha, concepto = p_concepto WHERE id = p_id;
  RETURN json_build_object('success', TRUE);
END;
$$;

-- 7. FUNCIÓN: eliminar_pago
CREATE OR REPLACE FUNCTION eliminar_pago(
  p_id INTEGER,
  p_pin TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valido BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM deudas WHERE activa = TRUE AND pin = p_pin) INTO v_valido;
  IF NOT v_valido THEN
    RETURN json_build_object('success', FALSE, 'error', 'PIN incorrecto');
  END IF;
  DELETE FROM pagos WHERE id = p_id;
  RETURN json_build_object('success', TRUE);
END;
$$;

-- 8. FUNCIÓN: iniciar_deuda (crear o actualizar)
CREATE OR REPLACE FUNCTION iniciar_deuda(
  p_total INTEGER,
  p_nombre TEXT DEFAULT 'Mi deuda',
  p_nuevo_pin TEXT DEFAULT NULL,
  p_pin TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valido BOOLEAN;
  v_existe BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM deudas WHERE activa = TRUE) INTO v_existe;

  IF v_existe THEN
    SELECT EXISTS(SELECT 1 FROM deudas WHERE activa = TRUE AND pin = p_pin) INTO v_valido;
    IF NOT v_valido THEN
      RETURN json_build_object('success', FALSE, 'error', 'PIN incorrecto');
    END IF;
  END IF;

  IF v_existe THEN
    IF p_nuevo_pin IS NOT NULL AND p_nuevo_pin <> '' THEN
      UPDATE deudas SET total = p_total, nombre = p_nombre, pin = p_nuevo_pin WHERE activa = TRUE;
    ELSE
      UPDATE deudas SET total = p_total, nombre = p_nombre WHERE activa = TRUE;
    END IF;
  ELSE
    INSERT INTO deudas (total, nombre, pin)
    VALUES (p_total, p_nombre, COALESCE(NULLIF(p_nuevo_pin, ''), '1234'));
  END IF;

  RETURN json_build_object('success', TRUE);
END;
$$;

-- 9. ROW LEVEL SECURITY
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS DE LECTURA PÚBLICA
DROP POLICY IF EXISTS "Lectura pública deudas" ON deudas;
CREATE POLICY "Lectura pública deudas" ON deudas
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Lectura pública pagos" ON pagos;
CREATE POLICY "Lectura pública pagos" ON pagos
  FOR SELECT USING (TRUE);

-- Las escrituras se manejan exclusivamente vía las funciones SECURITY DEFINER
