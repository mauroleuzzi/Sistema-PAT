import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { loadLocalState, saveLocalState } from '../db/sqlite';
import { SupabaseRuntimeConfig } from '../types';

const DEFAULT_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  'https://pjbssuzligqyhqvycrpe.supabase.co';

const DEFAULT_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYnNzdXpsaWdxeWhxdnljcnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDcwNjMsImV4cCI6MjA5MDMyMzA2M30.Pfjg6zKvRdrNhmwIQEmbPpEzlwhADmYg2PRFDACzYI0';

const STORAGE_KEY_SUPABASE = 'pat_supabase_runtime_config_v2';

const initialConfig = loadLocalState<SupabaseRuntimeConfig>(STORAGE_KEY_SUPABASE, {
  url: DEFAULT_SUPABASE_URL,
  anonKey: DEFAULT_SUPABASE_ANON_KEY,
  isDemoMode: false,
});

export let IS_DEMO: boolean = initialConfig.isDemoMode;

export let supabase: SupabaseClient = createClient(initialConfig.url, initialConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const getSupabaseConfig = (): SupabaseRuntimeConfig => {
  return loadLocalState<SupabaseRuntimeConfig>(STORAGE_KEY_SUPABASE, {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    isDemoMode: IS_DEMO,
  });
};

export const updateSupabaseConfig = (nextConfig: SupabaseRuntimeConfig): SupabaseClient => {
  const cleanUrl = nextConfig.url.trim() || DEFAULT_SUPABASE_URL;
  const cleanKey = nextConfig.anonKey.trim() || DEFAULT_SUPABASE_ANON_KEY;
  const saved: SupabaseRuntimeConfig = {
    url: cleanUrl,
    anonKey: cleanKey,
    isDemoMode: nextConfig.isDemoMode,
  };
  saveLocalState(STORAGE_KEY_SUPABASE, saved);
  IS_DEMO = saved.isDemoMode;
  supabase = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return supabase;
};

/**
 * Verifica conectividad real con la instancia de Supabase con timeout de 4 segundos.
 */
export const checkSupabaseConnection = async (customUrl?: string, customKey?: string): Promise<{
  connected: boolean;
  latencyMs: number;
  statusMessage: string;
}> => {
  const cfg = getSupabaseConfig();
  const targetUrl = (customUrl || cfg.url).replace(/\/$/, '');
  const targetKey = customKey || cfg.anonKey;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${targetUrl}/rest/v1/administraciones?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: targetKey,
        Authorization: `Bearer ${targetKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return {
        connected: true,
        latencyMs,
        statusMessage: `Conectado a Supabase (${latencyMs} ms)`,
      };
    }
    return {
      connected: false,
      latencyMs,
      statusMessage: `Respuesta HTTP ${response.status}: verifique tablas o API Key`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      connected: false,
      latencyMs,
      statusMessage:
        err?.name === 'AbortError'
          ? 'Timeout (4s): instancia de Supabase pausada o inaccesible'
          : `Sin conexión al servidor Supabase (${err?.message || 'Error de red'})`,
    };
  }
};

/**
 * Convierte y sube una fotografía en Base64 directamente a Supabase Storage (bucket 'pat-fotos')
 * Retorna la URL pública HTTPS accesible globalmente o null en caso de falla/offline.
 */
export const uploadBase64ToStorage = async (
  medicionId: string,
  tipo: 'tablero' | 'tierra',
  dataUri: string
): Promise<string | null> => {
  try {
    if (!dataUri) return null;
    if (dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
      return dataUri;
    }
    if (!dataUri.startsWith('data:image')) {
      return dataUri;
    }

    const match = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) return dataUri;

    const mimeExt = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64Data = match[2];
    const path = `${medicionId}/${tipo}.${mimeExt}`;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${mimeExt === 'jpg' ? 'jpeg' : mimeExt}` });

    const { error } = await supabase.storage.from('pat-fotos').upload(path, blob, {
      contentType: `image/${mimeExt === 'jpg' ? 'jpeg' : mimeExt}`,
      upsert: true,
    });

    if (error) {
      console.warn(`Error al subir ${tipo} a Supabase Storage:`, error);
      return null;
    }

    const { data: pubData } = supabase.storage.from('pat-fotos').getPublicUrl(path);
    return pubData?.publicUrl || null;
  } catch (err) {
    console.warn(`Error procesando subida de ${tipo} a Storage:`, err);
    return null;
  }
};

