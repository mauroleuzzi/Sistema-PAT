import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, Card, ProgressBar, Divider } from 'react-native-paper';
import { pickAndParseExcel, downloadTemplate, exportToExcel } from '../src/services/excelService';
import { validateRow, flagInternalDuplicates, ConsorcioRow, normalizeAddress, calculateNextExpiration } from '../src/services/importValidator';
import ImportPreviewTable from '../src/components/admin/ImportPreviewTable';
import { useRouter } from 'expo-router';
import { supabase, IS_DEMO } from '../src/lib/supabase';
import { executeImport } from '../src/services/importExecutor';
import { useDemo } from '../src/context/DemoContext';

export default function AdminImportar() {
  const router = useRouter();
  const { consorcios, administraciones, addConsorcio, updateConsorcio, addAdministracion, refreshFromSupabase } = useDemo();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConsorcioRow[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('import_excel.xlsx');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const checkExternalDuplicates = async (candidateRows: ConsorcioRow[]): Promise<ConsorcioRow[]> => {
    const existingSet = new Set<string>(
      consorcios.map(c => normalizeAddress(c.direccion)).filter(Boolean)
    );

    if (!IS_DEMO) {
      const normalizedAddresses = candidateRows.map(r => normalizeAddress(r.direccion_obligatoria)).filter(Boolean);
      if (normalizedAddresses.length > 0) {
        try {
          const { data: existingRecords } = await supabase
            .from('consorcios')
            .select('direccion_normalizada')
            .in('direccion_normalizada', normalizedAddresses);
          if (existingRecords) {
            existingRecords.forEach(r => existingSet.add(r.direccion_normalizada));
          }
        } catch (e) {
          // Si Supabase no responde, usamos el set local
        }
      }
    }

    return candidateRows.map(row => {
      if (row._status === 'ok' && existingSet.has(normalizeAddress(row.direccion_obligatoria))) {
        return {
          ...row,
          _status: 'duplicado_externo',
          _action: row._action === 'actualizar' ? 'actualizar' : 'omitir',
          _errors: [...(row._errors || []), 'Ya existe en la base de datos.'],
        };
      }
      return row;
    });
  };

  const checkNetwork = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      setIsOffline(!!error);
    } catch (e) {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    checkNetwork();
  }, []);
  
  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();
    } catch (e) {
      Alert.alert('Error', 'No se pudo descargar la plantilla.');
    }
  };

  const handleUploadFile = async () => {
    if (isOffline) {
      Alert.alert('Sin Conexión', 'La importación masiva requiere conexión a internet para evitar conflictos.');
      return;
    }

    setLoading(true);
    try {
      const data = await pickAndParseExcel();
      if (!data) {
        setLoading(false);
        return;
      }
      
      let parsedData = data.data || data; 
      if (data.fileName) setOriginalFileName(data.fileName);
      
      let parsedRows = parsedData.map((row: any, i: number) => validateRow(row, i + 2)); 
      
      parsedRows = flagInternalDuplicates(parsedRows);
      parsedRows = await checkExternalDuplicates(parsedRows);
      
      setRows(parsedRows);
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = async (rowIndex: number, field: keyof ConsorcioRow, value: string) => {
    let updated = [...rows];
    const itemIndex = updated.findIndex(r => r._rowNumber === rowIndex);
    if (itemIndex > -1) {
        updated[itemIndex] = { ...updated[itemIndex], [field]: value };
        
        let newParsedRows = updated.map((row) => validateRow(row, row._rowNumber!));
        newParsedRows = flagInternalDuplicates(newParsedRows);
        newParsedRows = await checkExternalDuplicates(newParsedRows);

        setRows(newParsedRows);
    }
  };

  const handleActionChange = (rowIndex: number, action: ConsorcioRow['_action']) => {
    const updated = [...rows];
    const item = updated.find(r => r._rowNumber === rowIndex);
    if (item) {
        item._action = action;
        setRows(updated);
    }
  };

  const handleConfirmImport = async () => {
    setGlobalError(null);
    if (isOffline) {
      Alert.alert('Sin Conexión', 'Se requiere conexión a internet.');
      return;
    }

    const hasCriticalErrors = rows.some(r => r._status === 'error' && r._action !== 'omitir');
    if (hasCriticalErrors) {
      const msg = 'Hay filas con errores críticos que no están marcadas para Omitir.';
      setGlobalError(msg);
      try { Alert.alert('Errores pendientes', msg); } catch(err) {}
      return;
    }

    setLoading(true);
    try {
      if (IS_DEMO) {
        const summary = { total: rows.length, crear: 0, actualizar: 0, omitir: 0, errores: 0 };
        const localErrorRows: any[] = [];

        for (const row of rows) {
          if (row._action === 'omitir' || row._status === 'error') {
            summary.omitir++;
            if (row._status === 'error') summary.errores++;
            localErrorRows.push({
              Fila: row._rowNumber,
              Direccion: row.direccion_obligatoria,
              Accion: row._action,
              Estado: row._status === 'error' ? 'error' : 'omitido',
              Errores: row._errors?.join(' | ') || 'Omitida manualmente',
            });
            continue;
          }

          let adminObj = administraciones.find(
            a => a.nombre.toLowerCase() === row.administracion_nombre_obligatorio.trim().toLowerCase()
          );
          if (!adminObj) {
            adminObj = {
              id: `adm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              nombre: row.administracion_nombre_obligatorio.trim(),
              cuit: row.administracion_cuit_opcional,
              contacto: row.administracion_contacto_opcional,
              telefono: row.administracion_telefono_opcional,
              email: row.administracion_email_opcional,
              domicilio: row.administracion_domicilio_opcional,
            };
            addAdministracion(adminObj);
          }

          const vencimiento = calculateNextExpiration(row.ultima_fecha_medicion_opcional) || undefined;

          if (row._action === 'crear') {
            addConsorcio({
              id: `con-${Date.now()}-${row._rowNumber}`,
              direccion: row.direccion_obligatoria.trim(),
              solicitante: row.solicitante_opcional?.trim() || `Consorcio ${row.direccion_obligatoria.trim()}`,
              cuit: row.consorcio_cuit_opcional,
              telefono: row.telefono_opcional,
              email: row.email_opcional,
              administracion_id: adminObj.id,
              observaciones_base: row.observaciones_opcional,
              activo: row.estado_obligatorio !== 'inactivo',
              vencimiento_proximo: vencimiento,
            });
            summary.crear++;
          } else if (row._action === 'actualizar') {
            const existing = consorcios.find(
              c => normalizeAddress(c.direccion) === normalizeAddress(row.direccion_obligatoria)
            );
            if (existing) {
              updateConsorcio(existing.id, {
                solicitante: row.solicitante_opcional?.trim() || existing.solicitante,
                cuit: row.consorcio_cuit_opcional || existing.cuit,
                telefono: row.telefono_opcional || existing.telefono,
                email: row.email_opcional || existing.email,
                administracion_id: adminObj.id,
                observaciones_base: row.observaciones_opcional || existing.observaciones_base,
                vencimiento_proximo: vencimiento || existing.vencimiento_proximo,
              });
              summary.actualizar++;
            }
          }
        }

        setImportResult({
          batchId: `DEMO-${Date.now().toString().slice(-6)}`,
          summary,
          localErrorRows,
        });
        setStep(3);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || '00000000-0000-0000-0000-000000000000'; 
      
      const res = await executeImport(rows, originalFileName, userId);
      await refreshFromSupabase();
      setImportResult(res);
      setStep(3);
    } catch (e: any) {
      const errMsg = e.message || JSON.stringify(e) || 'Hubo un problema al procesar la importación en el servidor.';
      setGlobalError(errMsg);
      try { Alert.alert('Error', errMsg); } catch(err) {}
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrors = async () => {
    if (!importResult) return;
    
    try {
      if (importResult.localErrorRows && importResult.localErrorRows.length > 0) {
        await exportToExcel(importResult.localErrorRows, 'import_errores.xlsx');
        return;
      }
      const { data: realErrors } = await supabase
        .from('import_batch_rows')
        .select('*')
        .eq('import_batch_id', importResult.batchId)
        .or('estado.eq.error,accion.eq.omitir'); 
        
      if (realErrors && realErrors.length > 0) {
        const errorRows = realErrors.map(r => ({
          Fila: r.numero_fila,
          Direccion: r.direccion,
          Accion: r.accion,
          Estado: r.estado,
          Errores: r.mensaje_error
        }));
        await exportToExcel(errorRows, 'import_errores.xlsx');
      } else {
        Alert.alert('Info', 'No hubo errores ni omitidos para descargar.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo descargar el detalle de errores.');
    }
  };

  const summary = {
    total: rows.length,
    omitidos: rows.filter(r => r._action === 'omitir').length,
    crear: rows.filter(r => r._action === 'crear').length,
    actualizar: rows.filter(r => r._action === 'actualizar').length,
    errores: rows.filter(r => r._status === 'error').length,
    criticosSinOmitir: rows.filter(r => r._status === 'error' && r._action !== 'omitir').length,
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Asistente de Importación</Text>
      <ProgressBar progress={step / 3} style={styles.progress} />
      
      {isOffline && (
        <Card style={{marginBottom: 16, backgroundColor: '#ffebee'}}>
          <Card.Content>
            <Text style={{color: '#c62828'}}>Estás en modo Offline. La importación masiva está deshabilitada.</Text>
          </Card.Content>
        </Card>
      )}

      {step === 1 && (
        <Card style={styles.card}>
          <Card.Title title="Paso 1: Archivo" />
          <Card.Content>
            <Text style={{marginBottom: 16}}>Descarga la plantilla obligatoria, llénala con los datos correspondientes y luego sube el archivo modificado.</Text>
            <Button mode="outlined" icon="download" onPress={handleDownloadTemplate} style={{marginBottom: 16}}>
              Descargar Plantilla
            </Button>
            <Button mode="contained" icon="upload" onPress={handleUploadFile} loading={loading} disabled={loading || isOffline}>
              Subir Archivo (.xlsx)
            </Button>
          </Card.Content>
        </Card>
      )}

      {step === 2 && (
        <Card style={styles.card}>
          <Card.Title title="Paso 2: Previsualización y Corrección" />
          <Card.Content>
            <View style={styles.summaryBox}>
              <Text>Total leídos: {summary.total}</Text>
              <Text>A Crear: {summary.crear}</Text>
              <Text>A Actualizar: {summary.actualizar}</Text>
              <Text style={{color: summary.errores > 0 ? 'red' : 'green'}}>Errores Críticos: {summary.errores}</Text>
              <Text>Omitidos: {summary.omitidos}</Text>
            </View>
            <Divider style={{marginVertical: 16}} />
            <Text style={{fontSize: 12, marginBottom: 8}}>Puedes editar las celdas directamente para corregir errores.</Text>
            <ImportPreviewTable 
              rows={rows} 
              onRowChange={handleRowChange} 
              onActionChange={handleActionChange} 
            />
          </Card.Content>
          <Card.Actions style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            {globalError && <Text style={{ color: 'red', marginBottom: 8, fontWeight: 'bold' }}>{globalError}</Text>}
            <View style={{ flexDirection: 'row' }}>
              <Button onPress={() => setStep(1)} disabled={loading}>Atrás</Button>
              <Button 
                mode="contained" 
                onPress={handleConfirmImport} 
                loading={loading} 
                disabled={loading || summary.criticosSinOmitir > 0}
              >
                Confirmar e Importar
              </Button>
            </View>
          </Card.Actions>
        </Card>
      )}

      {step === 3 && importResult && (
        <Card style={styles.card}>
          <Card.Title title="Paso 3: Resultado de Importación" />
          <Card.Content>
            <View style={styles.summaryBox}>
              <Text style={{fontWeight: 'bold'}}>Lote ID: {importResult.batchId}</Text>
              <Divider style={{marginVertical: 8}} />
              <Text>Total procesados: {importResult.summary.total}</Text>
              <Text>Creados: {importResult.summary.crear}</Text>
              <Text>Actualizados: {importResult.summary.actualizar}</Text>
              <Text>Omitidos: {importResult.summary.omitir}</Text>
              <Text style={{color: importResult.summary.errores > 0 ? 'red' : 'green'}}>
                Errores en ejecución: {importResult.summary.errores}
              </Text>
            </View>
            
            {(importResult.summary.errores > 0 || importResult.summary.omitir > 0) && (
              <Button mode="outlined" icon="download" onPress={handleDownloadErrors} style={{marginTop: 16}}>
                Descargar Detalle de Errores y Omitidos
              </Button>
            )}
            
            <Button mode="contained" onPress={() => router.replace('/(tabs)/consorcio')} style={{marginTop: 16}}>
              Volver al Inicio
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5'
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  progress: {
    marginBottom: 24,
    height: 8,
    borderRadius: 4
  },
  card: {
    marginBottom: 24
  },
  summaryBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8
  }
});
