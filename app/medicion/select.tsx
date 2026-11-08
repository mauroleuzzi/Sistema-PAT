import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Searchbar, Title, Paragraph, useTheme, Surface, Text, Button, TextInput as PaperInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Building2, ChevronRight, Plus } from 'lucide-react-native';
import { useDemo } from '../../src/context/DemoContext';
import { getConsorcioStatus, generateUUID } from '../../src/lib/utils';

export default function SelectConsorcio() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const theme = useTheme();
  const { consorcios, administraciones, mediciones, addConsorcio, addAdministracion } = useDemo();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    direccion: '',
    solicitante: '',
    locacion: '',
    administracion_id: administraciones[0]?.id || 'adm-1',
    nuevaAdminNombre: '',
  });

  const measuredIds = useMemo(() => new Set(mediciones.map(m => m.consorcio_id)), [mediciones]);

  const filteredConsorcios = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return consorcios.filter(c => {
      const admin = administraciones.find(a => a.id === c.administracion_id);
      return (
        !q ||
        c.direccion.toLowerCase().includes(q) ||
        c.solicitante.toLowerCase().includes(q) ||
        (admin?.nombre && admin.nombre.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, consorcios, administraciones]);

  const handleCreateAndMeasure = () => {
    if (!newForm.direccion.trim()) {
      Alert.alert('Campo obligatorio', 'Ingrese la dirección del consorcio.');
      return;
    }

    let targetAdminId = newForm.administracion_id || administraciones[0]?.id || 'adm-1';
    if (newForm.nuevaAdminNombre.trim()) {
      const createdAdminId = generateUUID();
      addAdministracion({
        id: createdAdminId,
        nombre: newForm.nuevaAdminNombre.trim(),
      });
      targetAdminId = createdAdminId;
    }

    const newConsorcioId = generateUUID();
    addConsorcio({
      id: newConsorcioId,
      direccion: newForm.direccion.trim(),
      solicitante: newForm.solicitante.trim() || `Consorcio ${newForm.direccion.trim()}`,
      administracion_id: targetAdminId,
      locacion_medicion_default: newForm.locacion.trim() || 'Tablero Principal Planta Baja',
      activo: true,
      vencimiento_proximo: undefined,
    });

    setShowNewModal(false);
    router.replace({
      pathname: '/medicion/nueva',
      params: { id: newConsorcioId },
    });
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.searchContainer} elevation={0}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Title style={styles.headerTitle}>Iniciar Medición</Title>
            <Paragraph style={styles.headerSubtitle}>Seleccioná el consorcio o creá uno nuevo en el acto</Paragraph>
          </View>
          <TouchableOpacity
            style={styles.newBuildingBtn}
            onPress={() => {
              setNewForm({
                direccion: searchQuery.trim(),
                solicitante: '',
                locacion: '',
                administracion_id: administraciones[0]?.id || 'adm-1',
                nuevaAdminNombre: '',
              });
              setShowNewModal(true);
            }}
          >
            <Plus size={16} color="#fff" strokeWidth={3} />
            <Text style={styles.newBuildingBtnText}>NUEVO</Text>
          </TouchableOpacity>
        </View>
        <Searchbar
          placeholder="Buscar dirección o administración..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={theme.colors.primary}
        />
      </Surface>

      <FlatList
        data={filteredConsorcios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const adminObj = administraciones.find(a => a.id === item.administracion_id);
          const status = getConsorcioStatus(item, measuredIds.has(item.id));
          return (
            <Surface style={styles.card} elevation={1}>
              <TouchableOpacity
                style={styles.cardInner}
                onPress={() =>
                  router.push({
                    pathname: '/medicion/nueva',
                    params: { id: item.id },
                  })
                }
              >
                <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                  <Building2 size={24} color="#1F4FFF" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.direccion}>{item.direccion}</Text>
                  <Text style={styles.admin}>
                    {adminObj?.nombre || item.solicitante}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </Surface>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Title style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
              No se encontraron consorcios
            </Title>
            <Button
              mode="contained"
              buttonColor="#1F4FFF"
              style={{ marginTop: 12 }}
              onPress={() => {
                setNewForm(prev => ({ ...prev, direccion: searchQuery.trim() }));
                setShowNewModal(true);
              }}
            >
              + Crear "{searchQuery || 'Nuevo Consorcio'}" y Medir
            </Button>
          </View>
        }
      />

      <Modal visible={showNewModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <Surface style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '90%' }} elevation={4}>
            <ScrollView>
              <Title style={{ fontWeight: '900', marginBottom: 4 }}>Alta Rápida de Consorcio</Title>
              <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Se creará el consorcio y se abrirá de inmediato la planilla de medición PAT.
              </Text>
              <PaperInput
                label="Dirección *"
                mode="outlined"
                value={newForm.direccion}
                onChangeText={t => setNewForm(prev => ({ ...prev, direccion: t }))}
                style={{ marginBottom: 12, backgroundColor: '#fff' }}
              />
              <PaperInput
                label="Solicitante / Razón Social"
                mode="outlined"
                value={newForm.solicitante}
                onChangeText={t => setNewForm(prev => ({ ...prev, solicitante: t }))}
                style={{ marginBottom: 12, backgroundColor: '#fff' }}
              />
              <PaperInput
                label="Locación de medición por defecto"
                mode="outlined"
                placeholder="Tablero Principal Planta Baja"
                value={newForm.locacion}
                onChangeText={t => setNewForm(prev => ({ ...prev, locacion: t }))}
                style={{ marginBottom: 12, backgroundColor: '#fff' }}
              />

              <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 0.8, marginBottom: 8 }}>
                ADMINISTRACIÓN
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {administraciones.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setNewForm(prev => ({ ...prev, administracion_id: a.id, nuevaAdminNombre: '' }))}
                    style={[
                      styles.adminChip,
                      newForm.administracion_id === a.id && !newForm.nuevaAdminNombre.trim() && styles.adminChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.adminChipText,
                        newForm.administracion_id === a.id && !newForm.nuevaAdminNombre.trim() && { color: '#fff' },
                      ]}
                    >
                      {a.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PaperInput
                label="¿Nueva Administración? Escribir nombre aquí (opcional)"
                mode="outlined"
                value={newForm.nuevaAdminNombre}
                onChangeText={t => setNewForm(prev => ({ ...prev, nuevaAdminNombre: t }))}
                style={{ marginBottom: 16, backgroundColor: '#fff' }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Button onPress={() => setShowNewModal(false)}>Cancelar</Button>
                <Button mode="contained" buttonColor="#1F4FFF" onPress={handleCreateAndMeasure}>
                  Crear e Iniciar Medición
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94a3b8',
    marginBottom: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  newBuildingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F4FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
  },
  newBuildingBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  searchbar: {
    borderRadius: 12,
    backgroundColor: '#fff',
    height: 50,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  direccion: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  admin: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  adminChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminChipActive: { backgroundColor: '#1F4FFF', borderColor: '#1F4FFF' },
  adminChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
});
