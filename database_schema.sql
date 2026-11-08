-- ============================================================================
-- SISTEMA PAT - ESQUEMA COMPLETO POSTGRESQL / SUPABASE (v1.6.0)
-- ============================================================================

-- 1. Tablas Principales

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT,
  email TEXT UNIQUE,
  rol TEXT CHECK (rol IN ('admin', 'tecnico')),
  firma_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.administraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cuit TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  domicilio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.consorcios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direccion TEXT NOT NULL UNIQUE,
  direccion_normalizada TEXT UNIQUE,
  solicitante TEXT,
  cuit TEXT,
  telefono TEXT,
  email TEXT,
  administracion_id UUID REFERENCES public.administraciones(id) ON DELETE SET NULL,
  locacion_medicion_default TEXT,
  observaciones_base TEXT,
  activo BOOLEAN DEFAULT true,
  estado TEXT DEFAULT 'pendiente_datos',
  ultima_fecha_medicion DATE,
  vencimiento_proximo DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.mediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID REFERENCES public.consorcios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_medicion DATE NOT NULL,
  estado TEXT CHECK (estado IN ('borrador', 'pendiente_sync', 'pendiente_completar', 'lista_para_pdf', 'pdf_generado', 'anulada')),
  resultado NUMERIC,
  condicion_suelo TEXT,
  condicion_suelo_otro TEXT,
  locacion TEXT,
  observaciones TEXT,
  foto_tablero_url TEXT,
  foto_tierra_url TEXT,
  heredado_locacion BOOLEAN DEFAULT false,
  heredado_condicion BOOLEAN DEFAULT false,
  heredado_observaciones BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  fecha_sync TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicion_id UUID REFERENCES public.mediciones(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('tablero', 'toma_tierra')),
  url TEXT NOT NULL,
  fecha_captura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  gps_lat DOUBLE PRECISION,
  gps_lon DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS public.pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicion_id UUID REFERENCES public.mediciones(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('protocolo', 'imagenes')),
  version INTEGER DEFAULT 1,
  url TEXT NOT NULL,
  vigente BOOLEAN DEFAULT true,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  generado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  motivo_regeneracion TEXT
);

CREATE TABLE IF NOT EXISTS public.seguimiento_anual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID REFERENCES public.consorcios(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  fecha_vencimiento DATE,
  estado_anual TEXT CHECK (estado_anual IN ('pendiente', 'proximo_a_vencer', 'vencido', 'realizado_nosotros', 'realizado_tercero', 'iniciado_incompleto', 'anulado')),
  realizado_por TEXT,
  fecha_realizacion DATE,
  observacion TEXT
);

CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id UUID,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  cambios JSONB
);

CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  nombre_archivo TEXT NOT NULL,
  total_filas INTEGER DEFAULT 0,
  creados INTEGER DEFAULT 0,
  actualizados INTEGER DEFAULT 0,
  omitidos INTEGER DEFAULT 0,
  errores INTEGER DEFAULT 0,
  resultado_general TEXT
);

CREATE TABLE IF NOT EXISTS public.import_batch_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE,
  numero_fila INTEGER,
  direccion TEXT,
  accion TEXT,
  estado TEXT,
  mensaje_error TEXT
);

-- 2. Índices para rendimiento de consultas y búsqueda de duplicados
CREATE INDEX IF NOT EXISTS idx_consorcios_direccion_norm ON public.consorcios(direccion_normalizada);
CREATE INDEX IF NOT EXISTS idx_consorcios_admin_id ON public.consorcios(administracion_id);
CREATE INDEX IF NOT EXISTS idx_mediciones_consorcio_id ON public.mediciones(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_mediciones_fecha ON public.mediciones(fecha_medicion DESC);
CREATE INDEX IF NOT EXISTS idx_fotos_medicion_id ON public.fotos(medicion_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_rows_batch_id ON public.import_batch_rows(import_batch_id);

-- 3. Permisos de Data API y Row Level Security (RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consorcios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimiento_anual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'administraciones', 'consorcios', 'mediciones',
    'fotos', 'pdfs', 'seguimiento_anual', 'auditoria',
    'import_batches', 'import_batch_rows'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "pat_select_%I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "pat_select_%I" ON public.%I FOR SELECT TO anon, authenticated USING (true);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "pat_insert_%I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "pat_insert_%I" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "pat_update_%I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "pat_update_%I" ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "pat_delete_%I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "pat_delete_%I" ON public.%I FOR DELETE TO anon, authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- 4. Bucket de Storage 'pat-fotos' y Políticas (SELECT + INSERT + UPDATE para upsert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pat-fotos', 'pat-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "pat_fotos_select" ON storage.objects;
CREATE POLICY "pat_fotos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'pat-fotos');

DROP POLICY IF EXISTS "pat_fotos_insert" ON storage.objects;
CREATE POLICY "pat_fotos_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'pat-fotos');

DROP POLICY IF EXISTS "pat_fotos_update" ON storage.objects;
CREATE POLICY "pat_fotos_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'pat-fotos')
  WITH CHECK (bucket_id = 'pat-fotos');

-- 5. Usuarios por Defecto (Admin y Técnico Operativo)
INSERT INTO public.usuarios (id, nombre, email, rol, activo)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'Ing. Daniel Horacio Leuzzi',
    'daniel.leuzzi@patmediciones.com',
    'admin',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Ing. Daniel Horacio Leuzzi',
    'admin@patmediciones.com',
    'admin',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Técnico Operativo PAT',
    'tecnico@patmediciones.com',
    'tecnico',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
