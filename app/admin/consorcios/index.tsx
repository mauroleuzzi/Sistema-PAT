import React, { useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { exportToExcel } from '../../../src/services/excelService';
import { supabase } from '../../../src/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function AdminConsorciosIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('consorcios').select('*, administraciones(nombre, cuit)');
      if (error) throw error;
      
      const formattedData = data.map(c => ({
        ...c,
        administracion_nombre: c.administraciones?.nombre || ''
      }));
      await exportToExcel(formattedData, 'consorcios_export.xlsx');
    } catch (e: any) {
      Alert.alert('Error exportando', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFullBackup = async () => {
    setLoading(true);
    try {
      // Fetch all core tables
      const [adminRes, consorcioRes, medicionRes, fotosRes, pdfsRes, batchesRes, rowsRes] = await Promise.all([
        supabase.from('administraciones').select('*'),
        supabase.from('consorcios').select('*'),
        supabase.from('mediciones').select('*'),
        supabase.from('fotos').select('*'),
        supabase.from('pdfs').select('*'),
        supabase.from('import_batches').select('*'),
        supabase.from('import_batch_rows').select('*')
      ]);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        administraciones: adminRes.data || [],
        consorcios: consorcioRes.data || [],
        mediciones: medicionRes.data || [],
        fotos_metadata: fotosRes.data || [],
        pdfs_metadata: pdfsRes.data || [],
        import_batches: batchesRes.data || [],
        import_batch_rows: rowsRes.data || []
      };
      
      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = `backup_full_${new Date().getTime()}.json`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const uri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(uri, jsonStr);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        }
      }
    } catch(e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Consorcios</Text>
      
      <Card style={styles.card}>
        <Card.Title title="Importación Masiva" subtitle="Cargar consorcios desde un archivo Excel" />
        <Card.Content>
          <Text variant="bodyMedium">
            Permite la carga rápida de múltiples consorcios, crea administraciones automáticamente y detecta duplicados.
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => router.push('/admin/consorcios/importar')}>
            Importar desde Excel
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Exportaciones y Backup" subtitle="Descargar información a tu dispositivo" />
        <Card.Actions>
          <Button mode="outlined" onPress={handleExport} loading={loading} disabled={loading}>
            Exportar a Excel
          </Button>
          <Button mode="outlined" onPress={handleFullBackup} style={styles.actionBtn} loading={loading} disabled={loading}>
            Backup Completo (JSON)
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5'
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
  },
  actionBtn: {
    marginLeft: 8
  }
});
