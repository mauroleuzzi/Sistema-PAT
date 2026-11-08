export type Role = 'admin' | 'tecnico';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  firma_url?: string;
  activo: boolean;
}

export interface Administracion {
  id: string;
  nombre: string;
  cuit?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  domicilio?: string;
}

export interface Consorcio {
  id: string;
  direccion: string;
  solicitante: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  administracion_id: string;
  locacion_medicion_default?: string;
  observaciones_base?: string;
  activo: boolean;
  vencimiento_proximo?: string; // Calculated
}

export type MedicionEstado = 
  | 'borrador' 
  | 'pendiente_sync' 
  | 'pendiente_completar' 
  | 'lista_para_pdf' 
  | 'pdf_generado' 
  | 'anulada';

export interface Medicion {
  id: string;
  consorcio_id: string;
  usuario_id: string;
  fecha_medicion: string;
  estado: MedicionEstado;
  resultado?: number;
  condicion_suelo?: string;
  condicion_suelo_otro?: string;
  locacion?: string;
  observaciones?: string;
  heredado_locacion: boolean;
  heredado_condicion: boolean;
  heredado_observaciones: boolean;
  created_at: string;
  updated_at: string;
  fecha_sync?: string;
  foto_tablero_url?: string;
  foto_tierra_url?: string;
  sync_status?: 'pending' | 'synced' | 'error';
}

export interface ProfesionalConfig {
  nombre: string;
  matricula: string;
  entidad: string;
  instrumento: string;
  metodo: string;
  jurisdiccion: string;
  jurisdiccionCorta: string;
  firmaUrl?: string;
}

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  isDemoMode: boolean;
}

export interface Foto {
  id: string;
  medicion_id: string;
  tipo: 'tablero' | 'toma_tierra';
  url: string;
  fecha_captura: string;
  gps_lat?: number;
  gps_lon?: number;
}
