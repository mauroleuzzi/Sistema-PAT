import { ConsorcioRow, normalizeAddress, calculateNextExpiration } from './importValidator';
import { supabase } from '../lib/supabase';
import { db } from '../db/sqlite'; // For local sync of the history

export const executeImport = async (rows: ConsorcioRow[], fileName: string, userId: string) => {
  // 1. Crear el registro del batch
  const { data: batchData, error: batchError } = await supabase.from('import_batches').insert({
    usuario_id: userId,
    nombre_archivo: fileName,
    total_filas: rows.length
  }).select('id').single();

  if (batchError || !batchData) {
    throw new Error(`No se pudo crear el lote de importación: ${batchError?.message || 'Error desconocido'}`);
  }

  const batchId = batchData.id;
  
  const summary = {
    total: rows.length,
    crear: 0,
    actualizar: 0,
    omitir: 0,
    errores: 0
  };

  for (const row of rows) {
    if (row._action === 'omitir' || row._status === 'error') {
      summary.omitir++;
      if (row._status === 'error') {
        summary.errores++;
        // Registrar el error en DB
        await supabase.from('import_batch_rows').insert({
          import_batch_id: batchId,
          numero_fila: row._rowNumber,
          direccion: row.direccion_obligatoria,
          accion: row._action,
          estado: 'error',
          mensaje_error: row._errors?.join(' | ') || 'Error de validación'
        });
      } else {
        // Registrar fila omitida por el usuario (sin error crítico)
        await supabase.from('import_batch_rows').insert({
          import_batch_id: batchId,
          numero_fila: row._rowNumber,
          direccion: row.direccion_obligatoria,
          accion: 'omitir',
          estado: 'success',
          mensaje_error: 'Omitida manualmente'
        });
      }
      continue;
    }

    try {
      let adminId = null;

      // 2. Gestionar Administración
      const { data: existingAdmin } = await supabase
        .from('administraciones')
        .select('id')
        .ilike('nombre', row.administracion_nombre_obligatorio.trim())
        .limit(1)
        .maybeSingle();
        
      if (existingAdmin) {
        adminId = existingAdmin.id;
        // Optionally update admin data if provided
      } else {
        const { data: newAdmin, error: adminErr } = await supabase.from('administraciones').insert({
          nombre: row.administracion_nombre_obligatorio.trim(),
          cuit: row.administracion_cuit_opcional,
          contacto: row.administracion_contacto_opcional,
          telefono: row.administracion_telefono_opcional,
          email: row.administracion_email_opcional,
          domicilio: row.administracion_domicilio_opcional
        }).select('id').single();
        
        if (adminErr) throw adminErr;
        adminId = newAdmin.id;
      }

      const vencimientoCalculado = calculateNextExpiration(row.ultima_fecha_medicion_opcional) || null;

      // 3. Gestionar Consorcio
      if (row._action === 'crear') {
        const { error: consorcioErr } = await supabase.from('consorcios').insert({
          direccion: row.direccion_obligatoria.trim(),
          direccion_normalizada: normalizeAddress(row.direccion_obligatoria),
          administracion_id: adminId,
          estado: row.estado_obligatorio,
          ultima_fecha_medicion: row.ultima_fecha_medicion_opcional || null,
          vencimiento_proximo: vencimientoCalculado,
          cuit: row.consorcio_cuit_opcional,
          solicitante: row.solicitante_opcional || `Consorcio ${row.direccion_obligatoria.trim()}`,
          telefono: row.telefono_opcional,
          email: row.email_opcional,
          observaciones_base: row.observaciones_opcional
        });
        if (consorcioErr) throw consorcioErr;
        summary.crear++;
      } else if (row._action === 'actualizar') {
        const { error: updateErr } = await supabase.from('consorcios')
          .update({
            administracion_id: adminId,
            estado: row.estado_obligatorio,
            ultima_fecha_medicion: row.ultima_fecha_medicion_opcional || null,
            vencimiento_proximo: vencimientoCalculado,
            cuit: row.consorcio_cuit_opcional,
            solicitante: row.solicitante_opcional || `Consorcio ${row.direccion_obligatoria.trim()}`,
            telefono: row.telefono_opcional,
            email: row.email_opcional,
            observaciones_base: row.observaciones_opcional
          })
          .eq('direccion_normalizada', normalizeAddress(row.direccion_obligatoria));
        if (updateErr) throw updateErr;
        summary.actualizar++;
      }

      // 4. Guardar import_batch_rows (Éxito)
      await supabase.from('import_batch_rows').insert({
        import_batch_id: batchId,
        numero_fila: row._rowNumber,
        direccion: row.direccion_obligatoria,
        accion: row._action,
        estado: 'success'
      });

    } catch (e: any) {
      summary.errores++;
      await supabase.from('import_batch_rows').insert({
        import_batch_id: batchId,
        numero_fila: row._rowNumber,
        direccion: row.direccion_obligatoria,
        accion: row._action,
        estado: 'error',
        mensaje_error: e.message
      });
    }
  }

  // 5. Finalizar Batch
  await supabase.from('import_batches').update({
    creados: summary.crear,
    actualizados: summary.actualizar,
    omitidos: summary.omitir,
    errores: summary.errores,
    resultado_general: summary.errores > 0 ? 'Con Errores' : 'Exitoso'
  }).eq('id', batchId);
  
  // 6. Sincronizar el batch localmente para tenerlo offline
  try {
    const isWeb = require('react-native').Platform.OS === 'web';
    if (!isWeb) {
      db.runSync('INSERT INTO import_batches_locales (id, nombre_archivo, total_filas, creados, actualizados, omitidos, errores, resultado_general) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [batchId, fileName, summary.total, summary.crear, summary.actualizar, summary.omitir, summary.errores, summary.errores > 0 ? 'Con Errores' : 'Exitoso']);
    }
  } catch (e) {
    console.log('No se pudo guardar localmente:', e);
  }

  return { batchId, summary };
};
