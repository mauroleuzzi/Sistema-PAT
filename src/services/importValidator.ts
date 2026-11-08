import { addYears, parseISO, isValid, format } from 'date-fns';

export interface ConsorcioRow {
  direccion_obligatoria: string;
  administracion_nombre_obligatorio: string;
  consorcio_cuit_opcional?: string;
  solicitante_opcional?: string;
  telefono_opcional?: string;
  email_opcional?: string;
  barrio_localidad_opcional?: string;
  observaciones_opcional?: string;
  ultima_fecha_medicion_opcional?: string;
  estado_obligatorio: string;
  
  administracion_cuit_opcional?: string;
  administracion_contacto_opcional?: string;
  administracion_telefono_opcional?: string;
  administracion_email_opcional?: string;
  administracion_domicilio_opcional?: string;
  administracion_observaciones_opcional?: string;

  // Validation metadata
  _rowNumber?: number;
  _status?: 'ok' | 'error' | 'duplicado_interno' | 'duplicado_externo';
  _errors?: string[];
  _action?: 'omitir' | 'actualizar' | 'crear';
}

/**
 * Normaliza una dirección para búsqueda de duplicados.
 * - Pasa a minúsculas y remueve tildes/diacríticos (NFD)
 * - Elimina espacios dobles y puntuación innecesaria
 * - Normaliza abreviaturas comunes (av., avda., gral., etc.)
 */
export const normalizeAddress = (address: string | undefined | null): string => {
  if (!address) return '';
  
  let normalized = address
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents/tildes
    .trim();
  normalized = normalized.replace(/[.,;-]/g, ' '); // replace punctuation with space
  normalized = normalized.replace(/\s+/g, ' ').trim(); // collapse multiple spaces
  
  // Normalize common abbreviations at start or word boundaries
  normalized = normalized.replace(/^(av|avda)\s+/g, 'avenida ');
  normalized = normalized.replace(/\s+(av|avda)\s+/g, ' avenida ');
  normalized = normalized.replace(/^(bv|bvard)\s+/g, 'boulevard ');
  normalized = normalized.replace(/\s+(bv|bvard)\s+/g, ' boulevard ');
  normalized = normalized.replace(/^gral\s+/g, 'general ');
  normalized = normalized.replace(/\s+gral\s+/g, ' general ');
  
  return normalized;
};

/**
 * Parsea una fecha en formato ISO (YYYY-MM-DD), formato local (DD/MM/YYYY o DD-MM-YYYY)
 * o número serial de Excel (ej. 45672) y devuelve un objeto Date válido o null.
 */
export const parseFlexibleDate = (rawStr: string | number | null | undefined): Date | null => {
  if (rawStr === null || rawStr === undefined) return null;
  const str = String(rawStr).trim();
  if (!str) return null;

  // 1. Número serial de Excel (ej. entre 20000 [~1954] y 60000 [~2064])
  if (/^\d{5}$/.test(str)) {
    const serial = Number(str);
    if (serial >= 20000 && serial <= 60000) {
      const utcMs = Math.round((serial - 25569) * 86400 * 1000);
      const d = new Date(utcMs);
      // Ajustar a fecha local sin desfase horario
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  // 2. Formato ISO estricto YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && y >= 1990 && y <= 2100) {
      return date;
    }
    return null;
  }

  // 3. Formato Argentino DD/MM/YYYY o DD-MM-YYYY
  const arMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (arMatch) {
    const d = Number(arMatch[1]);
    const m = Number(arMatch[2]);
    const y = Number(arMatch[3]);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && y >= 1990 && y <= 2100) {
      return date;
    }
    return null;
  }

  // 4. Fallback parseISO
  const parsed = parseISO(str);
  if (isValid(parsed) && parsed.getFullYear() >= 1990 && parsed.getFullYear() <= 2100) {
    return parsed;
  }
  return null;
};

/**
 * Calcula el próximo vencimiento (1 año después de la última medición)
 */
export const calculateNextExpiration = (lastDateStr: string | null | undefined): string | null => {
  const date = parseFlexibleDate(lastDateStr);
  if (!date) return null;
  try {
    const nextYear = addYears(date, 1);
    return format(nextYear, 'yyyy-MM-dd');
  } catch (e) {
    return null;
  }
};

/**
 * Valida una fila de Excel y le asigna un estado inicial
 */
export const validateRow = (row: any, index: number): ConsorcioRow => {
  const errors: string[] = [];
  
  // Limpiar estados previos de validación, pero respetar la acción si no es 'crear' por defecto
  const parsedRow: ConsorcioRow = {
    ...row,
    _rowNumber: index,
    _status: 'ok',
    _errors: []
  };

  // Si no tenía acción o era error antes, reset a crear
  if (!parsedRow._action) {
    parsedRow._action = 'crear';
  }

  if (!parsedRow.direccion_obligatoria || parsedRow.direccion_obligatoria.toString().trim() === '') {
    errors.push('La dirección es obligatoria.');
  }

  if (!parsedRow.administracion_nombre_obligatorio || parsedRow.administracion_nombre_obligatorio.toString().trim() === '') {
    errors.push('El nombre de la administración es obligatorio.');
  }

  const validEstados = ['activo', 'inactivo', 'pendiente_datos', 'no_trabajar_mas'];
  if (!parsedRow.estado_obligatorio || parsedRow.estado_obligatorio.toString().trim() === '') {
    parsedRow.estado_obligatorio = 'pendiente_datos';
  } else {
    if (!validEstados.includes(parsedRow.estado_obligatorio.toLowerCase())) {
        errors.push(`Estado inválido. Debe ser uno de: ${validEstados.join(', ')}`);
    } else {
        parsedRow.estado_obligatorio = parsedRow.estado_obligatorio.toLowerCase();
    }
  }

  if (parsedRow.ultima_fecha_medicion_opcional && parsedRow.ultima_fecha_medicion_opcional.toString().trim() !== '') {
    const parsedDate = parseFlexibleDate(parsedRow.ultima_fecha_medicion_opcional.toString());
    if (!parsedDate) {
        errors.push('El formato de la última fecha de medición es inválido. Use YYYY-MM-DD o DD/MM/YYYY.');
    } else {
        parsedRow.ultima_fecha_medicion_opcional = format(parsedDate, 'yyyy-MM-dd');
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (parsedRow.email_opcional && parsedRow.email_opcional.toString().trim() !== '') {
    if (!emailRegex.test(parsedRow.email_opcional.toString().trim())) {
      errors.push('El email del consorcio no es válido.');
    }
  }

  if (parsedRow.administracion_email_opcional && parsedRow.administracion_email_opcional.toString().trim() !== '') {
    if (!emailRegex.test(parsedRow.administracion_email_opcional.toString().trim())) {
      errors.push('El email de la administración no es válido.');
    }
  }

  if (errors.length > 0) {
    parsedRow._status = 'error';
    parsedRow._errors = errors;
    parsedRow._action = 'omitir';
  } else if (
    parsedRow._action === 'omitir' &&
    (row._status === 'error' || row._status === 'duplicado_interno' || row._status === 'duplicado_externo')
  ) {
    // Si antes era error o duplicado y estaba en omitir, al arreglarse vuelve a crear
    parsedRow._action = 'crear';
  }

  return parsedRow;
};

/**
 * Procesa un array de filas, detectando duplicados intra-archivo
 * Para duplicados contra la base de datos, se requerirá consulta a Supabase.
 */
export const flagInternalDuplicates = (rows: ConsorcioRow[]): ConsorcioRow[] => {
  const seenAddresses = new Map<string, number>();

  return rows.map((row) => {
    if (row._status === 'error') return row;

    const normalized = normalizeAddress(row.direccion_obligatoria);
    if (seenAddresses.has(normalized)) {
        return {
          ...row,
          _status: 'duplicado_interno',
          _errors: [...(row._errors || []), `Duplicado interno con la fila ${seenAddresses.get(normalized)}`],
          _action: 'omitir'
        };
    } else {
        seenAddresses.set(normalized, row._rowNumber!);
        return row;
    }
  });
};
