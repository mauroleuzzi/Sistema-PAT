import { MedicionEstado, Consorcio } from '../types';

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getStatusColor = (status: MedicionEstado | string, theme: any) => {
  switch (status) {
    case 'pdf_generado':
      return theme.colors.tertiary; // Green
    case 'lista_para_pdf':
      return theme.colors.tertiary + '80'; // Light Green
    case 'pendiente_completar':
      return theme.colors.secondary; // Yellow
    case 'anulada':
    case 'vencido':
      return theme.colors.error; // Red
    default:
      return '#666'; // Gray
  }
};

export const getFieldColor = (isHeredado: boolean, isMissing: boolean, theme: any) => {
  if (isMissing) return theme.colors.error + '20'; // Red bg
  if (isHeredado) return theme.colors.secondary + '20'; // Yellow bg
  return '#fff'; // White
};

export const formatDate = (date?: string | Date) => {
  if (!date) return '--/--/----';
  if (typeof date === 'string') {
    const isoDateMatch = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const [, year, month, day] = isoDateMatch;
      return `${day}/${month}/${year}`;
    }
    const arDateMatch = date.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (arDateMatch) {
      const [, d, m, y] = arDateMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return String(date);
  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Devuelve AAAA-MM-DD según la hora LOCAL del dispositivo.
 * (toISOString() usa UTC: en Argentina, después de las 21:00 devolvía la fecha del día siguiente).
 */
export const toLocalIsoDate = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Convierte fechas ingresadas tanto en formato ISO (AAAA-MM-DD) como formato argentino (DD/MM/AAAA o DD-MM-AAAA)
 * a formato ISO estándar AAAA-MM-DD.
 */
export const parseFlexibleDateToIso = (dateInput?: string, fallbackIso?: string): string => {
  const fallback = fallbackIso || toLocalIsoDate();
  if (!dateInput || !dateInput.trim()) return fallback;
  const s = dateInput.trim();
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const arMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (arMatch) {
    const [, d, m, y] = arMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return fallback;
};

const MONTHS_ES_LOWER = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const formatLongDateEs = (dateStr?: string): string => {
  if (!dateStr) {
    return new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const isoMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIdx = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const monthName = MONTHS_ES_LOWER[monthIdx] || '';
    return `${day} de ${monthName} de ${year}`;
  }
  return formatDate(dateStr);
};

/**
 * Formatea el valor final de resistencia para mostrar e imprimir en PDF:
 * Quita el cero inicial si es >= 1 y usa coma para los 2 decimales (ej: 01,23 -> "1,23" | 12,34 -> "12,34").
 */
export const formatResistance = (value?: number | string): string => {
  if (value === undefined || value === null || value === '') return '0,00';
  const normalized = typeof value === 'string' ? value.replace(',', '.') : String(value);
  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return '0,00';
  return num.toFixed(2).replace('.', ',');
};

/**
 * Formatea los centésimos en máscara de carga progresiva de derecha a izquierda (ej: "00,00" -> "00,01" -> "00,12" -> "01,23" -> "12,34").
 */
export const formatShiftRegisterDisplay = (value?: number | string): string => {
  const normalized = typeof value === 'string' ? value.replace(',', '.') : String(value || '');
  const num = parseFloat(normalized);
  const cents = !isNaN(num) && num > 0 ? Math.round(num * 100) : 0;
  const padded = String(Math.max(0, cents)).padStart(4, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  return `${intPart},${decPart}`;
};

export type ConsorcioStatusCode = 'vencido' | 'proximo' | 'al_dia' | 'sin_medir';

export interface ConsorcioStatusInfo {
  code: ConsorcioStatusCode;
  status: ConsorcioStatusCode;
  label: string;
  color: string;
  bg: string;
  daysRemaining: number | null;
}

/**
 * Calcula el estado real de vencimiento de un consorcio:
 * - Vencido (< hoy): Rojo
 * - Próximo a vencer (0 a 60 días): Ámbar
 * - Al día (> 60 días): Verde
 * - Sin medir (sin fecha de vencimiento ni medición): Gris
 */
export const getConsorcioStatus = (
  consorcio: Consorcio,
  hasMedicion: boolean = false
): ConsorcioStatusInfo => {
  if (!consorcio.vencimiento_proximo) {
    if (hasMedicion) {
      return {
        code: 'al_dia',
        status: 'al_dia',
        label: 'Al día',
        color: '#16A344',
        bg: '#dcfce7',
        daysRemaining: null,
      };
    }
    return {
      code: 'sin_medir',
      status: 'sin_medir',
      label: 'Sin medir',
      color: '#64748b',
      bg: '#f1f5f9',
      daysRemaining: null,
    };
  }

  const parts = consorcio.vencimiento_proximo.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return hasMedicion
      ? {
          code: 'al_dia',
          status: 'al_dia',
          label: 'Al día',
          color: '#16A344',
          bg: '#dcfce7',
          daysRemaining: null,
        }
      : {
          code: 'sin_medir',
          status: 'sin_medir',
          label: 'Sin medir',
          color: '#64748b',
          bg: '#f1f5f9',
          daysRemaining: null,
        };
  }

  const [y, m, d] = parts;
  const expDate = new Date(y, m - 1, d, 23, 59, 59);
  const now = new Date();
  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      code: 'vencido',
      status: 'vencido',
      label: 'Vencido',
      color: '#DC2626',
      bg: '#fee2e2',
      daysRemaining: diffDays,
    };
  }

  if (diffDays <= 60) {
    return {
      code: 'proximo',
      status: 'proximo',
      label: `Vence en ${diffDays}d`,
      color: '#D97706',
      bg: '#fef3c7',
      daysRemaining: diffDays,
    };
  }

  return {
    code: 'al_dia',
    status: 'al_dia',
    label: 'Al día',
    color: '#16A344',
    bg: '#dcfce7',
    daysRemaining: diffDays,
  };
};
