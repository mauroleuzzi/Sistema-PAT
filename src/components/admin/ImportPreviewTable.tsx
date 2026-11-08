import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, DataTable, Chip, TextInput, SegmentedButtons } from 'react-native-paper';
import { ConsorcioRow } from '../../services/importValidator';

interface Props {
  rows: ConsorcioRow[];
  onRowChange: (rowIndex: number, field: keyof ConsorcioRow, value: string) => void;
  onActionChange: (rowIndex: number, action: ConsorcioRow['_action']) => void;
}

export default function ImportPreviewTable({ rows, onRowChange, onActionChange }: Props) {
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'error': return '#ffcccb';
      case 'duplicado_interno': return '#ffe0b2'; // orange-ish for internal
      case 'duplicado_externo': return '#fffacd'; // yellow-ish for external
      case 'ok': return '#e8f5e9';
      default: return '#f0f0f0';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    if (status === 'duplicado_interno') return 'DUPLICADO INTERNO';
    if (status === 'duplicado_externo') return 'YA EXISTE EN DB';
    return status?.toUpperCase() || 'DESCONOCIDO';
  };

  return (
    <ScrollView horizontal>
      <View>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title style={styles.colSmall}>Fila</DataTable.Title>
            <DataTable.Title style={styles.colMedium}>Estado</DataTable.Title>
            <DataTable.Title style={styles.colLarge}>Dirección *</DataTable.Title>
            <DataTable.Title style={styles.colLarge}>Administración *</DataTable.Title>
            <DataTable.Title style={styles.colMediumInput}>Últ. Medición</DataTable.Title>
            <DataTable.Title style={styles.colLarge}>Email Consorcio</DataTable.Title>
            <DataTable.Title style={styles.colLarge}>Errores</DataTable.Title>
            <DataTable.Title style={styles.colAction}>
              <View>
                <Text style={styles.actionHeader}>Acción a realizar</Text>
                <Text style={styles.actionSubHeader}>(Click para cambiar)</Text>
              </View>
            </DataTable.Title>
          </DataTable.Header>

          <ScrollView style={styles.scrollVertical}>
            {rows.map((row, i) => (
              <DataTable.Row key={i} style={{ backgroundColor: getStatusColor(row._status) }}>
                <DataTable.Cell style={styles.colSmall}>{row._rowNumber}</DataTable.Cell>
                <DataTable.Cell style={styles.colMedium}>
                  <Chip style={{ backgroundColor: getStatusColor(row._status), transform: [{scale: 0.8}] }}>
                    {getStatusLabel(row._status)}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell style={styles.colLarge}>
                  <TextInput
                    mode="outlined"
                    dense
                    style={styles.input}
                    value={row.direccion_obligatoria || ''}
                    onChangeText={(val) => onRowChange(row._rowNumber!, 'direccion_obligatoria', val)}
                  />
                </DataTable.Cell>
                <DataTable.Cell style={styles.colLarge}>
                  <TextInput
                    mode="outlined"
                    dense
                    style={styles.input}
                    value={row.administracion_nombre_obligatorio || ''}
                    onChangeText={(val) => onRowChange(row._rowNumber!, 'administracion_nombre_obligatorio', val)}
                  />
                </DataTable.Cell>
                <DataTable.Cell style={styles.colMediumInput}>
                  <TextInput
                    mode="outlined"
                    dense
                    placeholder="YYYY-MM-DD"
                    style={styles.input}
                    value={row.ultima_fecha_medicion_opcional || ''}
                    onChangeText={(val) => onRowChange(row._rowNumber!, 'ultima_fecha_medicion_opcional', val)}
                  />
                </DataTable.Cell>
                <DataTable.Cell style={styles.colLarge}>
                  <TextInput
                    mode="outlined"
                    dense
                    placeholder="email@dominio.com"
                    style={styles.input}
                    value={row.email_opcional || ''}
                    onChangeText={(val) => onRowChange(row._rowNumber!, 'email_opcional', val)}
                  />
                </DataTable.Cell>
                <DataTable.Cell style={styles.colLarge}>
                  <Text style={{ color: 'red', fontSize: 11 }} numberOfLines={3}>
                    {row._errors?.join(' | ')}
                  </Text>
                </DataTable.Cell>
                <DataTable.Cell style={styles.colAction}>
                  <View style={styles.actionContainer}>
                    {row._status === 'ok' && (
                      <Chip 
                        selected={row._action === 'crear'}
                        onPress={() => onActionChange(row._rowNumber!, 'crear')}
                        style={[styles.actionChip, row._action === 'crear' ? styles.chipCrear : styles.chipInactive]}
                        textStyle={row._action === 'crear' ? styles.chipTextActive : styles.chipTextInactive}
                        icon={row._action === 'crear' ? 'check' : undefined}
                      >
                        Crear
                      </Chip>
                    )}
                    
                    {row._status === 'duplicado_externo' && (
                      <>
                        <Chip 
                          selected={row._action === 'actualizar'}
                          onPress={() => onActionChange(row._rowNumber!, 'actualizar')}
                          style={[styles.actionChip, row._action === 'actualizar' ? styles.chipActualizar : styles.chipInactive]}
                          textStyle={row._action === 'actualizar' ? styles.chipTextActive : styles.chipTextInactive}
                        >
                          Actualizar
                        </Chip>
                        <Chip 
                          selected={row._action === 'omitir'}
                          onPress={() => onActionChange(row._rowNumber!, 'omitir')}
                          style={[styles.actionChip, row._action === 'omitir' ? styles.chipOmitir : styles.chipInactive]}
                          textStyle={row._action === 'omitir' ? styles.chipTextActive : styles.chipTextInactive}
                        >
                          Omitir
                        </Chip>
                      </>
                    )}

                    {(row._status === 'error' || row._status === 'duplicado_interno') && (
                      <Chip 
                        selected={true}
                        style={[styles.actionChip, styles.chipOmitir]}
                        textStyle={styles.chipTextActive}
                        icon="alert-circle-outline"
                      >
                        Omitir (Obligatorio)
                      </Chip>
                    )}
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </ScrollView>
        </DataTable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 1600,
  },
  scrollVertical: {
    maxHeight: 500,
  },
  colSmall: {
    width: 50,
  },
  colMedium: {
    width: 130,
  },
  colMediumInput: {
    width: 150,
  },
  colLarge: {
    width: 240,
  },
  colAction: {
    width: 280,
    justifyContent: 'center'
  },
  actionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingVertical: 4
  },
  actionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F4FFF'
  },
  actionSubHeader: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic'
  },
  actionChip: {
    height: 32,
  },
  chipInactive: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6
  },
  chipCrear: {
    backgroundColor: '#4CAF50',
  },
  chipActualizar: {
    backgroundColor: '#2196F3',
  },
  chipOmitir: {
    backgroundColor: '#F44336',
  },
  chipTextActive: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  chipTextInactive: {
    color: '#666',
    fontSize: 11
  },
  input: {
    height: 35,
    fontSize: 12,
    width: '95%'
  }
});
