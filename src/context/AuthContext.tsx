import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, Role } from '../types';
import { supabase } from '../lib/supabase';
import { loadLocalState, saveLocalState, removeLocalState } from '../db/sqlite';

const KEY_AUTH_USER = 'pat_auth_user_v1';

interface AuthContextType {
  user: Usuario | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FALLBACK_ACCOUNTS: Record<string, { pass: string; user: Usuario }> = {
  'admin@patmediciones.com': {
    pass: 'Mediciones22Pat',
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Ing. Daniel Horacio Leuzzi',
      email: 'admin@patmediciones.com',
      rol: 'admin',
      activo: true,
    },
  },
  'tecnico@patmediciones.com': {
    pass: 'Mediciones22Pat',
    user: {
      id: '22222222-2222-2222-2222-222222222222',
      nombre: 'Técnico Operativo PAT',
      email: 'tecnico@patmediciones.com',
      rol: 'tecnico',
      activo: true,
    },
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(() =>
    loadLocalState<Usuario | null>(KEY_AUTH_USER, null)
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const bootstrapSession = async () => {
      try {
        const cached = loadLocalState<Usuario | null>(KEY_AUTH_USER, null);
        if (cached && mounted) {
          setUser(cached);
        }

        const { data } = await supabase.auth.getSession();
        if (data?.session?.user && mounted) {
          const authUser = data.session.user;
          const { data: profileRow } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', authUser.email || '')
            .maybeSingle();

          const resolvedUser: Usuario = profileRow
            ? {
                id: profileRow.id,
                nombre: profileRow.nombre || authUser.user_metadata?.nombre || 'Usuario PAT',
                email: profileRow.email || authUser.email || '',
                rol: (profileRow.rol as Role) || 'tecnico',
                firma_url: profileRow.firma_url || undefined,
                activo: profileRow.activo ?? true,
              }
            : {
                id: authUser.id,
                nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario PAT',
                email: authUser.email || '',
                rol: (authUser.user_metadata?.rol as Role) || 'admin',
                activo: true,
              };

          setUser(resolvedUser);
          saveLocalState(KEY_AUTH_USER, resolvedUser);
        }
      } catch (e) {
        // Mantiene usuario cacheado si no hay conexión en el arranque (Offline-First)
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    bootstrapSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        removeLocalState(KEY_AUTH_USER);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (
    rawEmail: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const email = rawEmail.trim().toLowerCase();
    if (!email || !password) {
      return { ok: false, error: 'Por favor ingresá tu correo electrónico y contraseña.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        const authUser = data.user;
        const { data: profileRow } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        const resolvedUser: Usuario = profileRow
          ? {
              id: profileRow.id,
              nombre: profileRow.nombre || authUser.user_metadata?.nombre || 'Usuario PAT',
              email: profileRow.email || email,
              rol: (profileRow.rol as Role) || (authUser.user_metadata?.rol as Role) || 'tecnico',
              firma_url: profileRow.firma_url || undefined,
              activo: profileRow.activo ?? true,
            }
          : {
              id: authUser.id,
              nombre:
                authUser.user_metadata?.nombre ||
                FALLBACK_ACCOUNTS[email]?.user.nombre ||
                email.split('@')[0],
              email,
              rol:
                (authUser.user_metadata?.rol as Role) ||
                FALLBACK_ACCOUNTS[email]?.user.rol ||
                'admin',
              activo: true,
            };

        setUser(resolvedUser);
        saveLocalState(KEY_AUTH_USER, resolvedUser);
        return { ok: true };
      }

      // Si hay error de red/offline pero las credenciales coinciden con las cuentas operativas:
      const isNetworkError =
        error?.message?.toLowerCase().includes('fetch') ||
        error?.message?.toLowerCase().includes('network');
      if (isNetworkError && FALLBACK_ACCOUNTS[email] && FALLBACK_ACCOUNTS[email].pass === password) {
        const fallbackUser = FALLBACK_ACCOUNTS[email].user;
        setUser(fallbackUser);
        saveLocalState(KEY_AUTH_USER, fallbackUser);
        return { ok: true };
      }

      return {
        ok: false,
        error: 'Credenciales inválidas. Verificá tu correo y contraseña.',
      };
    } catch (e: any) {
      // Fallback Offline-First cuando no hay señal en sala de máquinas / subsuelo
      if (FALLBACK_ACCOUNTS[email] && FALLBACK_ACCOUNTS[email].pass === password) {
        const fallbackUser = FALLBACK_ACCOUNTS[email].user;
        setUser(fallbackUser);
        saveLocalState(KEY_AUTH_USER, fallbackUser);
        return { ok: true };
      }
      return {
        ok: false,
        error: e?.message || 'Error al iniciar sesión. Verificá tu conexión.',
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore network errors on signOut
    }
    removeLocalState(KEY_AUTH_USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.rol === 'admin',
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

