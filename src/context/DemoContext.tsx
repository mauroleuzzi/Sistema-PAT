import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Administracion, Consorcio, Medicion, ProfesionalConfig } from '../types';
import { MOCK_ADMINS, MOCK_CONSORCIOS, MOCK_MEDICIONES, DEFAULT_PROFESIONAL_CONFIG } from '../lib/demoData';
import { db, loadLocalState, saveLocalState, removeLocalState } from '../db/sqlite';
import { supabase, getSupabaseConfig } from '../lib/supabase';
import { normalizeAddress, calculateNextExpiration } from '../services/importValidator';
import { generateUUID } from '../lib/utils';

const KEY_ADMINS = 'pat_administraciones_v1';
const KEY_CONSORCIOS = 'pat_consorcios_v1';
const KEY_MEDICIONES = 'pat_mediciones_v1';
const KEY_PROFESIONAL = 'pat_profesional_config_v1';

interface DemoContextType {
  administraciones: Administracion[];
  consorcios: Consorcio[];
  mediciones: Medicion[];
  profesionalConfig: ProfesionalConfig;
  addMedicion: (medicion: Medicion) => void;
  updateMedicion: (id: string, updates: Partial<Medicion>) => void;
  deleteMedicion: (id: string) => void;
  addConsorcio: (consorcio: Consorcio) => void;
  updateConsorcio: (id: string, updates: Partial<Consorcio>) => void;
  deleteConsorcio: (id: string) => void;
  addAdministracion: (admin: Administracion) => void;
  updateAdministracion: (id: string, updates: Partial<Administracion>) => void;
  deleteAdministracion: (id: string) => void;
  updateProfesionalConfig: (config: Partial<ProfesionalConfig>) => void;
  resetDemoData: () => void;
  clearAllData: () => void;
  refreshFromSupabase: () => Promise<void>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const isValidUuid = (str?: string) =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [administraciones, setAdministraciones] = useState<Administracion[]>(() =>
    loadLocalState<Administracion[]>(KEY_ADMINS, MOCK_ADMINS)
  );
  const [consorcios, setConsorcios] = useState<Consorcio[]>(() =>
    loadLocalState<Consorcio[]>(KEY_CONSORCIOS, MOCK_CONSORCIOS)
  );
  const [mediciones, setMediciones] = useState<Medicion[]>(() =>
    loadLocalState<Medicion[]>(KEY_MEDICIONES, MOCK_MEDICIONES)
  );
  const [profesionalConfig, setProfesionalConfig] = useState<ProfesionalConfig>(() =>
    loadLocalState<ProfesionalConfig>(KEY_PROFESIONAL, DEFAULT_PROFESIONAL_CONFIG)
  );

  const refreshFromSupabase = async () => {
    try {
      const [admRes, conRes, medRes] = await Promise.all([
        supabase.from('administraciones').select('*').order('created_at', { ascending: false }),
        supabase.from('consorcios').select('*').order('created_at', { ascending: false }),
        supabase.from('mediciones').select('*').order('fecha_medicion', { ascending: false }),
      ]);

      if (!admRes.error && admRes.data && admRes.data.length > 0) {
        setAdministraciones(prev => {
          const remoteIds = new Set(admRes.data.map((a: any) => a.id));
          const remoteNames = new Set(admRes.data.map((a: any) => (a.nombre || '').toLowerCase().trim()));
          const localOnly = prev.filter(
            a => !remoteIds.has(a.id) && !remoteNames.has((a.nombre || '').toLowerCase().trim())
          );
          return [...localOnly, ...(admRes.data as Administracion[])];
        });
      }

      if (!conRes.error && conRes.data && conRes.data.length > 0) {
        const latestMedByConsorcio = new Map<string, string>();
        if (!medRes.error && medRes.data) {
          (medRes.data as Medicion[]).forEach(m => {
            const prevDate = latestMedByConsorcio.get(m.consorcio_id);
            if (m.fecha_medicion && (!prevDate || m.fecha_medicion > prevDate)) {
              latestMedByConsorcio.set(m.consorcio_id, m.fecha_medicion);
            }
          });
        }
        // Auto-reparación: el vencimiento nunca puede ser anterior a (última medición + 1 año)
        const healedVenc = new Map<string, string>();
        (conRes.data as Consorcio[]).forEach(rc => {
          const latestMedDate = latestMedByConsorcio.get(rc.id);
          const expFromMed = latestMedDate ? calculateNextExpiration(latestMedDate) : null;
          if (expFromMed && (!rc.vencimiento_proximo || expFromMed > rc.vencimiento_proximo)) {
            healedVenc.set(rc.id, expFromMed);
          }
        });
        setConsorcios(prev => {
          const remoteIds = new Set(conRes.data.map((c: any) => c.id));
          const remoteNorms = new Set(
            conRes.data.map((c: any) => normalizeAddress(c.direccion || ''))
          );
          const localById = new Map<string, Consorcio>();
          const localByNorm = new Map<string, Consorcio>();
          prev.forEach(c => {
            localById.set(c.id, c);
            localByNorm.set(normalizeAddress(c.direccion || ''), c);
          });
          MOCK_CONSORCIOS.forEach(mc => {
            const norm = normalizeAddress(mc.direccion || '');
            if (!localByNorm.has(norm)) localByNorm.set(norm, mc);
          });

          const mergedRemote = (conRes.data as Consorcio[]).map(rc => {
            const matchLocal =
              localById.get(rc.id) || localByNorm.get(normalizeAddress(rc.direccion || ''));
            return {
              ...rc,
              vencimiento_proximo: healedVenc.get(rc.id) || rc.vencimiento_proximo || undefined,
              administracion_id:
                rc.administracion_id || matchLocal?.administracion_id || 'adm-1',
              locacion_medicion_default:
                rc.locacion_medicion_default || matchLocal?.locacion_medicion_default,
            };
          });

          const localOnly = prev.filter(
            c => !remoteIds.has(c.id) && !remoteNorms.has(normalizeAddress(c.direccion || ''))
          );
          return [...localOnly, ...mergedRemote];
        });

        // Persistir la reparación en la nube (silencioso)
        healedVenc.forEach((venc, conId) => {
          supabase
            .from('consorcios')
            .update({ vencimiento_proximo: venc })
            .eq('id', conId)
            .then(() => {}, () => {});
        });
      }

      if (!medRes.error && medRes.data && medRes.data.length > 0) {
        setMediciones(prev => {
          const remoteIds = new Set(medRes.data.map((m: any) => m.id));
          const localPhotoMap = new Map<string, { tab?: string; tie?: string }>();
          prev.forEach(m => {
            if (m.foto_tablero_url || m.foto_tierra_url) {
              localPhotoMap.set(m.id, {
                tab: m.foto_tablero_url,
                tie: m.foto_tierra_url,
              });
            }
          });

          const mergedRemote = (medRes.data as Medicion[]).map(rm => {
            const cachedPhotos = localPhotoMap.get(rm.id);
            const cleanTablero =
              rm.foto_tablero_url && !rm.foto_tablero_url.startsWith('blob:')
                ? rm.foto_tablero_url
                : cachedPhotos?.tab && !cachedPhotos.tab.startsWith('blob:')
                ? cachedPhotos.tab
                : undefined;
            const cleanTierra =
              rm.foto_tierra_url && !rm.foto_tierra_url.startsWith('blob:')
                ? rm.foto_tierra_url
                : cachedPhotos?.tie && !cachedPhotos.tie.startsWith('blob:')
                ? cachedPhotos.tie
                : undefined;
            return {
              ...rm,
              foto_tablero_url: cleanTablero,
              foto_tierra_url: cleanTierra,
              sync_status: 'synced' as const,
            };
          });

          const localPending = prev.filter(
            m => !remoteIds.has(m.id) && m.sync_status === 'pending'
          );

          return [...localPending, ...mergedRemote];
        });
      }
    } catch (e) {
      // Mantiene datos locales en modo Offline-First
    }
  };

  useEffect(() => {
    if (!getSupabaseConfig().isDemoMode) {
      refreshFromSupabase();
    }
  }, []);

  useEffect(() => {
    saveLocalState(KEY_ADMINS, administraciones);
  }, [administraciones]);

  useEffect(() => {
    saveLocalState(KEY_CONSORCIOS, consorcios);
  }, [consorcios]);

  useEffect(() => {
    saveLocalState(KEY_MEDICIONES, mediciones);
  }, [mediciones]);

  useEffect(() => {
    saveLocalState(KEY_PROFESIONAL, profesionalConfig);
  }, [profesionalConfig]);

  const addMedicion = (medicion: Medicion) => {
    const finalMedId = isValidUuid(medicion.id) ? medicion.id : generateUUID();
    const withSync: Medicion = {
      ...medicion,
      id: finalMedId,
      sync_status: medicion.sync_status || 'pending',
    };
    setMediciones(prev => [withSync, ...prev]);

    if (!getSupabaseConfig().isDemoMode) {
      (async () => {
        try {
          let remoteConsorcioId = withSync.consorcio_id;
          const targetCon = consorcios.find(c => c.id === withSync.consorcio_id);
          if (targetCon) {
            const normAddr = normalizeAddress(targetCon.direccion);
            // El vencimiento se calcula desde ESTA medición: evita que el upsert reenvíe el vencimiento viejo
            // (closure desactualizado) y pise el valor nuevo enviado por updateConsorcio (condición de carrera).
            const newExp = calculateNextExpiration(withSync.fecha_medicion);
            const finalExp =
              newExp && (!targetCon.vencimiento_proximo || newExp > targetCon.vencimiento_proximo)
                ? newExp
                : targetCon.vencimiento_proximo || null;
            const { data: upsertedCon } = await supabase
              .from('consorcios')
              .upsert(
                {
                  id: isValidUuid(targetCon.id) ? targetCon.id : generateUUID(),
                  direccion: targetCon.direccion,
                  direccion_normalizada: normAddr,
                  solicitante: targetCon.solicitante,
                  administracion_id: isValidUuid(targetCon.administracion_id)
                    ? targetCon.administracion_id
                    : null,
                  locacion_medicion_default:
                    withSync.locacion || targetCon.locacion_medicion_default,
                  activo: targetCon.activo,
                  vencimiento_proximo: finalExp,
                },
                { onConflict: 'direccion_normalizada' }
              )
              .select('id')
              .maybeSingle();
            if (upsertedCon?.id) {
              remoteConsorcioId = upsertedCon.id;
            }
          }

          if (!isValidUuid(remoteConsorcioId)) {
            return; // Queda como 'pending' hasta que se sincronice el consorcio
          }

          const { data: inserted, error } = await supabase
            .from('mediciones')
            .upsert({
              id: finalMedId,
              consorcio_id: remoteConsorcioId,
              usuario_id: isValidUuid(withSync.usuario_id)
                ? withSync.usuario_id
                : '11111111-1111-1111-1111-111111111111',
              fecha_medicion: withSync.fecha_medicion,
              estado: withSync.estado || 'pdf_generado',
              resultado: withSync.resultado,
              condicion_suelo: withSync.condicion_suelo,
              locacion: withSync.locacion,
              observaciones: withSync.observaciones,
              heredado_locacion: withSync.heredado_locacion,
              heredado_condicion: withSync.heredado_condicion,
              heredado_observaciones: withSync.heredado_observaciones,
              foto_tablero_url: withSync.foto_tablero_url,
              foto_tierra_url: withSync.foto_tierra_url,
              fecha_sync: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();

          if (!error && inserted?.id) {
            setMediciones(prev =>
              prev.map(m =>
                m.id === finalMedId
                  ? {
                      ...m,
                      id: inserted.id,
                      sync_status: 'synced',
                      fecha_sync: new Date().toISOString(),
                    }
                  : m
              )
            );
          }
        } catch (err) {
          // Permanece como 'pending' para sincronizar luego
        }
      })();
    }

    if (Platform.OS !== 'web') {
      try {
        db.runSync(
          `INSERT OR REPLACE INTO mediciones_locales
            (id, consorcio_id, usuario_id, fecha_medicion, estado, resultado, suelo, locacion, observaciones, foto_tablero_url, foto_tierra_url, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            withSync.id,
            withSync.consorcio_id,
            withSync.usuario_id,
            withSync.fecha_medicion,
            withSync.estado,
            withSync.resultado ?? 0,
            withSync.condicion_suelo ?? '',
            withSync.locacion ?? '',
            withSync.observaciones ?? '',
            withSync.foto_tablero_url ?? '',
            withSync.foto_tierra_url ?? '',
            'pending',
          ]
        );
      } catch (e) {
        console.warn('Error guardando medición en SQLite nativo:', e);
      }
    }
  };

  const updateMedicion = (id: string, updates: Partial<Medicion>) => {
    setMediciones(prev =>
      prev.map(m =>
        m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
      )
    );

    if (!getSupabaseConfig().isDemoMode && isValidUuid(id)) {
      (async () => {
        try {
          const dbUpdates: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };
          if (updates.fecha_medicion !== undefined) dbUpdates.fecha_medicion = updates.fecha_medicion;
          if (updates.resultado !== undefined) dbUpdates.resultado = updates.resultado;
          if (updates.condicion_suelo !== undefined) dbUpdates.condicion_suelo = updates.condicion_suelo;
          if (updates.locacion !== undefined) dbUpdates.locacion = updates.locacion;
          if (updates.observaciones !== undefined) dbUpdates.observaciones = updates.observaciones;
          if (updates.foto_tablero_url !== undefined) dbUpdates.foto_tablero_url = updates.foto_tablero_url;
          if (updates.foto_tierra_url !== undefined) dbUpdates.foto_tierra_url = updates.foto_tierra_url;
          if (updates.estado !== undefined) dbUpdates.estado = updates.estado;

          await supabase.from('mediciones').update(dbUpdates).eq('id', id);
        } catch (err) {
          // Cambio local ya aplicado
        }
      })();
    }
  };

  const deleteMedicion = (id: string) => {
    const targetMed = mediciones.find(m => m.id === id);
    const remainingMeds = mediciones.filter(m => m.id !== id);
    setMediciones(remainingMeds);

    if (targetMed) {
      const consorcioMeds = remainingMeds
        .filter(m => m.consorcio_id === targetMed.consorcio_id)
        .sort((a, b) => b.fecha_medicion.localeCompare(a.fecha_medicion));

      const latestMed = consorcioMeds[0];
      const nextExp = latestMed ? calculateNextExpiration(latestMed.fecha_medicion) || undefined : undefined;
      updateConsorcio(targetMed.consorcio_id, { vencimiento_proximo: nextExp });
    }

    if (!getSupabaseConfig().isDemoMode && isValidUuid(id)) {
      (async () => {
        try {
          await supabase.from('mediciones').delete().eq('id', id);
        } catch (err) {
          // Eliminado localmente
        }
      })();
    }
  };

  const addConsorcio = (consorcio: Consorcio) => {
    const finalConId = isValidUuid(consorcio.id) ? consorcio.id : generateUUID();
    const itemToSave: Consorcio = { ...consorcio, id: finalConId };
    setConsorcios(prev => [itemToSave, ...prev]);

    if (!getSupabaseConfig().isDemoMode) {
      (async () => {
        try {
          const normAddr = normalizeAddress(itemToSave.direccion);
          const { data } = await supabase
            .from('consorcios')
            .upsert(
              {
                id: finalConId,
                direccion: itemToSave.direccion,
                direccion_normalizada: normAddr,
                solicitante: itemToSave.solicitante,
                cuit: itemToSave.cuit,
                telefono: itemToSave.telefono,
                email: itemToSave.email,
                administracion_id: isValidUuid(itemToSave.administracion_id)
                  ? itemToSave.administracion_id
                  : null,
                locacion_medicion_default: itemToSave.locacion_medicion_default,
                observaciones_base: itemToSave.observaciones_base,
                activo: itemToSave.activo,
                vencimiento_proximo: itemToSave.vencimiento_proximo || null,
              },
              { onConflict: 'direccion_normalizada' }
            )
            .select('id')
            .maybeSingle();

          if (data?.id && data.id !== finalConId) {
            setConsorcios(prev =>
              prev.map(c => (c.id === finalConId ? { ...c, id: data.id } : c))
            );
            setMediciones(prev =>
              prev.map(m =>
                m.consorcio_id === finalConId ? { ...m, consorcio_id: data.id } : m
              )
            );
          }
        } catch (err) {
          // Guardado local ya aplicado
        }
      })();
    }
  };

  const updateConsorcio = (id: string, updates: Partial<Consorcio>) => {
    setConsorcios(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));

    if (!getSupabaseConfig().isDemoMode) {
      (async () => {
        try {
          const target = consorcios.find(c => c.id === id);
          const payload: Record<string, any> = { ...updates };
          if (updates.direccion) {
            payload.direccion_normalizada = normalizeAddress(updates.direccion);
          }
          if (payload.vencimiento_proximo === undefined) {
            payload.vencimiento_proximo = null;
          }
          if (payload.administracion_id && !isValidUuid(payload.administracion_id)) {
            delete payload.administracion_id;
          }
          if (isValidUuid(id)) {
            await supabase.from('consorcios').update(payload).eq('id', id);
          } else if (target) {
            await supabase
              .from('consorcios')
              .update(payload)
              .eq('direccion_normalizada', normalizeAddress(target.direccion));
          }
        } catch (err) {
          // Guardado local ya aplicado
        }
      })();
    }
  };

  const deleteConsorcio = (id: string) => {
    const target = consorcios.find(c => c.id === id);
    setConsorcios(prev => prev.filter(c => c.id !== id));
    setMediciones(prev => prev.filter(m => m.consorcio_id !== id));

    if (!getSupabaseConfig().isDemoMode) {
      (async () => {
        try {
          if (isValidUuid(id)) {
            await supabase.from('consorcios').delete().eq('id', id);
          } else if (target) {
            await supabase
              .from('consorcios')
              .delete()
              .eq('direccion_normalizada', normalizeAddress(target.direccion));
          }
        } catch (err) {
          // Eliminado localmente
        }
      })();
    }
  };

  const addAdministracion = (admin: Administracion) => {
    const finalAdmId = isValidUuid(admin.id) ? admin.id : generateUUID();
    const itemToSave: Administracion = { ...admin, id: finalAdmId };
    setAdministraciones(prev => [itemToSave, ...prev]);

    if (!getSupabaseConfig().isDemoMode) {
      (async () => {
        try {
          const { data } = await supabase
            .from('administraciones')
            .upsert({
              id: finalAdmId,
              nombre: itemToSave.nombre,
              cuit: itemToSave.cuit,
              contacto: itemToSave.contacto,
              telefono: itemToSave.telefono,
              email: itemToSave.email,
              domicilio: itemToSave.domicilio,
            })
            .select('id')
            .maybeSingle();

          if (data?.id && data.id !== finalAdmId) {
            setAdministraciones(prev =>
              prev.map(a => (a.id === finalAdmId ? { ...a, id: data.id } : a))
            );
            setConsorcios(prev =>
              prev.map(c =>
                c.administracion_id === finalAdmId ? { ...c, administracion_id: data.id } : c
              )
            );
          }
        } catch (err) {
          // Guardado local
        }
      })();
    }
  };

  const updateAdministracion = (id: string, updates: Partial<Administracion>) => {
    setAdministraciones(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
    if (!getSupabaseConfig().isDemoMode && isValidUuid(id)) {
      (async () => {
        try {
          await supabase.from('administraciones').update(updates).eq('id', id);
        } catch (err) {}
      })();
    }
  };

  const deleteAdministracion = (id: string) => {
    setAdministraciones(prev => prev.filter(a => a.id !== id));
    if (!getSupabaseConfig().isDemoMode && isValidUuid(id)) {
      (async () => {
        try {
          await supabase.from('administraciones').delete().eq('id', id);
        } catch (err) {}
      })();
    }
  };

  const updateProfesionalConfig = (updates: Partial<ProfesionalConfig>) => {
    setProfesionalConfig(prev => ({ ...prev, ...updates }));
  };

  const resetDemoData = () => {
    removeLocalState(KEY_ADMINS);
    removeLocalState(KEY_CONSORCIOS);
    removeLocalState(KEY_MEDICIONES);
    removeLocalState(KEY_PROFESIONAL);
    setAdministraciones(MOCK_ADMINS);
    setConsorcios(MOCK_CONSORCIOS);
    setMediciones(MOCK_MEDICIONES);
    setProfesionalConfig(DEFAULT_PROFESIONAL_CONFIG);
  };

  const clearAllData = () => {
    setConsorcios([]);
    setMediciones([]);
    saveLocalState(KEY_CONSORCIOS, []);
    saveLocalState(KEY_MEDICIONES, []);
  };

  return (
    <DemoContext.Provider
      value={{
        administraciones,
        consorcios,
        mediciones,
        profesionalConfig,
        addMedicion,
        updateMedicion,
        deleteMedicion,
        addConsorcio,
        updateConsorcio,
        deleteConsorcio,
        addAdministracion,
        updateAdministracion,
        deleteAdministracion,
        updateProfesionalConfig,
        resetDemoData,
        clearAllData,
        refreshFromSupabase,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used within a DemoProvider');
  return context;
};
