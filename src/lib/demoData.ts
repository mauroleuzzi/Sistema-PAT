import { Consorcio, Administracion, Medicion, ProfesionalConfig } from '../types';

export const DEFAULT_PROFESIONAL_CONFIG: ProfesionalConfig = {
  nombre: 'Ing. Daniel Horacio Leuzzi',
  matricula: 'I011508',
  entidad: 'COPIME',
  instrumento: 'SONEL MPI-530',
  metodo: 'IRAM 2281-1, IRAM 2281-3 (Método de Wenner con 2 jabalinas auxiliares)',
  jurisdiccion: 'Ciudad Autónoma de Buenos Aires',
  jurisdiccionCorta: 'C.A.B.A.',
  firmaUrl: '',
};

export const MOCK_ADMINS: Administracion[] = [
  { id: 'adm-1', nombre: 'Administración López & Asociados', cuit: '30-12345678-9', contacto: 'Juan López', email: 'consultas@lopezadmin.com' },
  { id: 'adm-2', nombre: 'Gestión Residencial S.A.', cuit: '30-98765432-1', contacto: 'Marta Pérez', email: 'info@gestionresidencial.com' },
  { id: 'adm-3', nombre: 'Admin Premium Towers', cuit: '30-55566677-8', contacto: 'Roberto Gómez', email: 'roberto@premiumtowers.com' },
];

export const MOCK_CONSORCIOS: Consorcio[] = [
  { id: 'con-1', direccion: 'Av. Corrientes 1234', solicitante: 'Consorcio Corrientes 1234', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Tablero Principal Planta Baja', vencimiento_proximo: '2026-04-15' },
  { id: 'con-2', direccion: 'Rivadavia 456', solicitante: 'Consorcio Edificio Rivadavia', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Toma de tierra patio interno', vencimiento_proximo: '2026-05-20' },
  { id: 'con-3', direccion: 'Serrano 987', solicitante: 'Consorcio Serrano 987', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Sala de máquinas', vencimiento_proximo: '2026-03-10' },
  { id: 'con-4', direccion: 'Callao 100', solicitante: 'Torres del Parque', administracion_id: 'adm-3', activo: true, locacion_medicion_default: 'Tablero Sótano', vencimiento_proximo: '2026-01-15' },
  { id: 'con-5', direccion: 'Libertador 4500', solicitante: 'Consorcio Libertador 4500', administracion_id: 'adm-3', activo: true, locacion_medicion_default: 'Hall de entrada', vencimiento_proximo: '2026-06-12' },
  { id: 'con-6', direccion: 'Juncal 2200', solicitante: 'Edificio Juncal', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Caja toma vereda', vencimiento_proximo: '2025-12-28' },
  { id: 'con-7', direccion: 'Pueyrredón 890', solicitante: 'Consorcio Pueyrredón', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Tablero Ascensores', vencimiento_proximo: '2026-08-04' },
  { id: 'con-8', direccion: 'Santa Fe 3400', solicitante: 'Galería Santa Fe', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Local 23 - Tablero', vencimiento_proximo: '2026-02-14' },
  { id: 'con-9', direccion: 'Canning 123', solicitante: 'Consorcio Canning', administracion_id: 'adm-3', activo: true, locacion_medicion_default: 'Caja inspección patio', vencimiento_proximo: '2026-09-19' },
  { id: 'con-10', direccion: 'Gorriti 4567', solicitante: 'Palermo Soho Tower', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Sala Bombas', vencimiento_proximo: '2026-03-22' },
  { id: 'con-11', direccion: 'Scalabrini Ortiz 500', solicitante: 'Consorcio S.O.', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Tablero Pasillo', vencimiento_proximo: '2026-11-11' },
  { id: 'con-12', direccion: 'Malabia 1900', solicitante: 'Edificio Malabia', administracion_id: 'adm-3', activo: true, locacion_medicion_default: 'Toma tierra Terraza', vencimiento_proximo: '2026-05-05' },
  { id: 'con-13', direccion: 'Gurruchaga 1100', solicitante: 'Consorcio Gurruchaga', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Tablero Cochera', vencimiento_proximo: '2026-12-01' },
  { id: 'con-14', direccion: 'Thames 234', solicitante: 'Edificio Thames', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Caja toma frente', vencimiento_proximo: '2026-07-25' },
  { id: 'con-15', direccion: 'Uriarte 1400', solicitante: 'Consorcio Uriarte', administracion_id: 'adm-3', activo: true, locacion_medicion_default: 'Tablero Lavadero', vencimiento_proximo: '2026-01-30' },
  { id: 'con-16', direccion: 'Darregueyra 2500', solicitante: 'Edificio D-2500', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Sala Calefacción', vencimiento_proximo: '2026-03-29' },
  { id: 'con-17', direccion: 'Fray Justo 3300', solicitante: 'Torres Fray', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Tablero SUM', vencimiento_proximo: '2026-10-15' },
  { id: 'con-18', direccion: 'Godoy Cruz 1500', solicitante: 'Consorcio G.C.', administracion_id: 'adm-3', activo: true, locacion_medicion_default: 'Caja inspección jardín', vencimiento_proximo: '2026-04-20' },
  { id: 'con-19', direccion: 'Borges 2100', solicitante: 'Edificio Borges', administracion_id: 'adm-1', activo: true, locacion_medicion_default: 'Tablero 1A', vencimiento_proximo: '2026-02-28' },
  { id: 'con-20', direccion: 'Humboldt 123', solicitante: 'Consorcio Humboldt', administracion_id: 'adm-2', activo: true, locacion_medicion_default: 'Tablero General', vencimiento_proximo: '2026-06-30' },
];

export const MOCK_MEDICIONES: Medicion[] = [
  { id: 'med-1', consorcio_id: 'con-1', usuario_id: 'user-1', fecha_medicion: '2025-04-15', estado: 'pdf_generado', resultado: 3.45, condicion_suelo: 'lecho_humedo', locacion: 'Tablero Principal Planta Baja', observaciones: 'Todo en orden.', heredado_locacion: false, heredado_condicion: false, heredado_observaciones: false, created_at: '2025-04-15T10:00:00Z', updated_at: '2025-04-15T10:00:00Z' },
  { id: 'med-2', consorcio_id: 'con-3', usuario_id: 'user-1', fecha_medicion: '2025-03-10', estado: 'pdf_generado', resultado: 12.5, condicion_suelo: 'lecho_seco', locacion: 'Sala de máquinas', observaciones: 'Valor alto, se requiere mantenimiento.', heredado_locacion: false, heredado_condicion: false, heredado_observaciones: false, created_at: '2025-03-10T10:00:00Z', updated_at: '2025-03-10T10:00:00Z' },
];
