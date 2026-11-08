import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const db = !isWeb
  ? SQLite.openDatabaseSync('pat_mediciones.db')
  : ({
      execSync: () => {},
      runSync: () => {},
      getFirstSync: () => null,
      getAllSync: () => [],
    } as any);

export const initDB = () => {
  if (isWeb) return;

  db.execSync(`
    CREATE TABLE IF NOT EXISTS kv_store_local (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mediciones_locales (
      id TEXT PRIMARY KEY,
      consorcio_id TEXT,
      usuario_id TEXT,
      fecha_medicion TEXT,
      estado TEXT,
      resultado REAL,
      suelo TEXT,
      suelo_otro TEXT,
      locacion TEXT,
      observaciones TEXT,
      foto_tablero_url TEXT,
      foto_tierra_url TEXT,
      fotos_pendientes INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fotos_locales (
      id TEXT PRIMARY KEY,
      medicion_id TEXT,
      tipo TEXT,
      uri TEXT,
      gps_lat REAL,
      gps_lon REAL,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS import_batches_locales (
      id TEXT PRIMARY KEY,
      fecha TEXT,
      usuario_id TEXT,
      nombre_archivo TEXT,
      total_filas INTEGER,
      creados INTEGER,
      actualizados INTEGER,
      omitidos INTEGER,
      errores INTEGER,
      resultado_general TEXT,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS import_batch_rows_locales (
      id TEXT PRIMARY KEY,
      import_batch_id TEXT,
      numero_fila INTEGER,
      direccion TEXT,
      accion TEXT,
      estado TEXT,
      mensaje_error TEXT
    );
  `);
};

/**
 * Persistencia local multiplataforma (Web: localStorage | Nativo: SQLite kv_store_local)
 */
export const loadLocalState = <T>(key: string, fallback: T): T => {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as T;
      }
      return fallback;
    } else {
      initDB();
      const row = db.getFirstSync('SELECT value FROM kv_store_local WHERE key = ?', [key]) as { value?: string } | null;
      if (row && row.value) {
        return JSON.parse(row.value) as T;
      }
      return fallback;
    }
  } catch (e) {
    console.warn(`Error loading local state for ${key}:`, e);
    return fallback;
  }
};

export const saveLocalState = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
    } else {
      initDB();
      db.runSync(
        'INSERT OR REPLACE INTO kv_store_local (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, serialized]
      );
    }
  } catch (e) {
    console.warn(`Error saving local state for ${key}:`, e);
  }
};

export const removeLocalState = (key: string): void => {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } else {
      initDB();
      db.runSync('DELETE FROM kv_store_local WHERE key = ?', [key]);
    }
  } catch (e) {
    console.warn(`Error removing local state for ${key}:`, e);
  }
};
