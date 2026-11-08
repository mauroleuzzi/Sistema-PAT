import { useState } from 'react';
import { Platform } from 'react-native';
import { db } from '../db/sqlite';
import { supabase, checkSupabaseConnection } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { Medicion, Consorcio, Administracion } from '../types';
import { normalizeAddress } from '../services/importValidator';

export const compressImage = async (uri: string): Promise<string> => {
  try {
    if (Platform.OS === 'web' || uri.startsWith('data:')) {
      return uri;
    }
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (e) {
    return uri;
  }
};

/**
 * Sube una fotografía (tablero o toma_tierra) a Supabase Storage (bucket 'pat-fotos')
 * y registra el metadato en la tabla 'fotos'.
 */
export const uploadPhotoToSupabase = async (
  localUri: string,
  medicionId: string,
  tipo: 'tablero' | 'toma_tierra'
): Promise<string | null> => {
  try {
    const compressedUri = await compressImage(localUri);
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const filePath = `${medicionId}/${tipo}_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('pat-fotos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    let finalUrl = localUri;
    if (!uploadError) {
      const { data: pubData } = supabase.storage.from('pat-fotos').getPublicUrl(filePath);
      if (pubData?.publicUrl) {
        finalUrl = pubData.publicUrl;
      }
    }

    await supabase.from('fotos').insert({
      medicion_id: medicionId,
      tipo,
      url: finalUrl,
      fecha_captura: new Date().toISOString(),
    });

    return finalUrl;
  } catch (e) {
    console.warn('Error uploading photo to Supabase Storage:', e);
    return null;
  }
};

export interface SyncSummary {
  ok: boolean;
  message: string;
  syncedMediciones: number;
  syncedFotos: number;
  errors: number;
}

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncSummary | null>(null);

  const syncData = async (contextData?: {
    mediciones: Medicion[];
    consorcios: Consorcio[];
    administraciones: Administracion[];
    onMedicionSynced?: (id: string, updates: Partial<Medicion>) => void;
  }): Promise<SyncSummary> => {
    setIsSyncing(true);
    let syncedMediciones = 0;
    let syncedFotos = 0;
    let errors = 0;

    try {
      const health = await checkSupabaseConnection();
      if (!health.connected) {
        const res: SyncSummary = {
          ok: false,
          message: health.statusMessage,
          syncedMediciones: 0,
          syncedFotos: 0,
          errors: 1,
        };
        setLastSyncResult(res);
        return res;
      }

      // 1. Sincronizar mediciones desde el estado unificado (Web + Móvil)
      const pendingContextMeds = (contextData?.mediciones || []).filter(
        m => m.sync_status === 'pending'
      );

      for (const med of pendingContextMeds) {
        try {
          const consorcio = contextData?.consorcios.find(c => c.id === med.consorcio_id);
          let remoteConsorcioId = med.consorcio_id;

          if (consorcio) {
            const normAddr = normalizeAddress(consorcio.direccion);
            const { data: existingCon } = await supabase
              .from('consorcios')
              .select('id')
              .eq('direccion_normalizada', normAddr)
              .maybeSingle();

            if (existingCon?.id) {
              remoteConsorcioId = existingCon.id;
            } else {
              const { data: createdCon } = await supabase
                .from('consorcios')
                .insert({
                  direccion: consorcio.direccion,
                  direccion_normalizada: normAddr,
                  solicitante: consorcio.solicitante,
                  locacion_medicion_default: consorcio.locacion_medicion_default,
                  activo: consorcio.activo,
                })
                .select('id')
                .maybeSingle();
              if (createdCon?.id) remoteConsorcioId = createdCon.id;
            }
          }

          const { data: insertedMed, error: medErr } = await supabase
            .from('mediciones')
            .insert({
              consorcio_id: remoteConsorcioId,
              fecha_medicion: med.fecha_medicion,
              estado: med.estado || 'pdf_generado',
              resultado: med.resultado,
              condicion_suelo: med.condicion_suelo,
              locacion: med.locacion,
              observaciones: med.observaciones,
              heredado_locacion: med.heredado_locacion,
              heredado_condicion: med.heredado_condicion,
              heredado_observaciones: med.heredado_observaciones,
              fecha_sync: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();

          if (medErr) throw medErr;

          const targetMedId = insertedMed?.id || med.id;

          if (med.foto_tablero_url) {
            const uploaded = await uploadPhotoToSupabase(med.foto_tablero_url, targetMedId, 'tablero');
            if (uploaded) syncedFotos++;
          }
          if (med.foto_tierra_url) {
            const uploaded = await uploadPhotoToSupabase(med.foto_tierra_url, targetMedId, 'toma_tierra');
            if (uploaded) syncedFotos++;
          }

          syncedMediciones++;
          contextData?.onMedicionSynced?.(med.id, {
            sync_status: 'synced',
            fecha_sync: new Date().toISOString(),
          });
        } catch (err) {
          errors++;
        }
      }

      // 2. Sincronizar cola SQLite nativa adicional si existiera
      if (Platform.OS !== 'web') {
        const pendingMediciones = db.getAllSync(
          'SELECT * FROM mediciones_locales WHERE sync_status = ?',
          ['pending']
        ) as any[];

        for (const medicion of pendingMediciones) {
          const { error } = await supabase.from('mediciones').insert({
            consorcio_id: medicion.consorcio_id,
            fecha_medicion: medicion.fecha_medicion,
            estado: 'pendiente_sync',
            resultado: medicion.resultado,
            condicion_suelo: medicion.suelo,
            locacion: medicion.locacion,
            observaciones: medicion.observaciones,
          });

          if (!error) {
            db.runSync('UPDATE mediciones_locales SET sync_status = ? WHERE id = ?', ['synced', medicion.id]);
            syncedMediciones++;
          } else {
            errors++;
          }
        }

        const pendingPhotos = db.getAllSync(
          'SELECT * FROM fotos_locales WHERE sync_status = ?',
          ['pending']
        ) as any[];

        for (const photo of pendingPhotos) {
          const uploadedUrl = await uploadPhotoToSupabase(photo.uri, photo.medicion_id, photo.tipo);
          if (uploadedUrl) {
            db.runSync('UPDATE fotos_locales SET sync_status = ? WHERE id = ?', ['synced', photo.id]);
            syncedFotos++;
          }
        }
      }

      const summary: SyncSummary = {
        ok: errors === 0,
        message:
          syncedMediciones > 0
            ? `Sincronización completada: ${syncedMediciones} mediciones y ${syncedFotos} fotos subidas.`
            : 'Todo está sincronizado al día.',
        syncedMediciones,
        syncedFotos,
        errors,
      };
      setLastSyncResult(summary);
      return summary;
    } catch (e: any) {
      const failSummary: SyncSummary = {
        ok: false,
        message: e?.message || 'Error inesperado durante la sincronización',
        syncedMediciones,
        syncedFotos,
        errors: errors + 1,
      };
      setLastSyncResult(failSummary);
      return failSummary;
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, lastSyncResult, syncData };
};
