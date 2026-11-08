/**
 * Implementación Web de persistencia local (localStorage) sin requerir wa-sqlite.wasm
 */
export const db = {
  execSync: () => {},
  runSync: () => {},
  getFirstSync: () => null,
  getAllSync: () => [],
} as any;

export const initDB = () => {
  // No-op en Web (usa localStorage)
};

export const loadLocalState = <T>(key: string, fallback: T): T => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    }
    return fallback;
  } catch (e) {
    console.warn(`Error loading local state for ${key}:`, e);
    return fallback;
  }
};

export const saveLocalState = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    }
  } catch (e) {
    console.warn(`Error saving local state for ${key}:`, e);
  }
};

export const removeLocalState = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`Error removing local state for ${key}:`, e);
  }
};

