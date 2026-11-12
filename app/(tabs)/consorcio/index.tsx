import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { Surface, Text, Title, Button, TextInput as PaperInput } from 'react-native-paper';
import { Search, ChevronRight, Building2, Plus } from 'lucide-react-native';
import { useDemo } from '../../../src/context/DemoContext';
import { useAuth } from '../../../src/context/AuthContext';
import { useSkin } from '../../../src/context/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getConsorcioStatus, formatDate, generateUUID } from '../../../src/lib/utils';

export default function Consorcios() {
  const { consorcios, mediciones, administraciones, addConsorcio, addAdministracion } = useDemo();
  const { isAdmin } = useAuth();
  const { skin } = useSkin();
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    direccion: '',
    solicitante: '',
    locacion: '',
    administracion_id: administraciones[0]?.id || 'adm-1',
    nuevaAdminNombre: '',
  });

  useEffect(() => {
    if (filter === 'ruta' || filter === 'mes') setActiveFilter('Ruta del mes');
    else if (filter === 'vencidos') setActiveFilter('Vencidos');
    else if (filter === 'pendientes') setActiveFilter('Sin medir');
    else if (filter === 'proximos') setActiveFilter('Próximos');
    else if (filter === 'aldia') setActiveFilter('Al día');
    else if (filter === 'todos') setActiveFilter('Todos');
  }, [filter]);

  const filters = ['Todos', 'Ruta del mes', 'Vencidos', 'Próximos', 'Al día', 'Sin medir'];
  const measuredConsorcioIds = new Set(mediciones.map(m => m.consorcio_id));

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const isRutaDelMes = (c: any) => {
    if (!c.vencimiento_proximo) return false;
    const isThisMonth = c.vencimiento_proximo.substring(0, 7) === currentYearMonth;
    const st = getConsorcioStatus(c, measuredConsorcioIds.has(c.id));
    return isThisMonth || st.status === 'proximo' || st.status === 'vencido';
  };

  const filterCounts: Record<string, number> = {
    Todos: consorcios.length,
    'Ruta del mes': consorcios.filter(isRutaDelMes).length,
    Vencidos: consorcios.filter(
      c => getConsorcioStatus(c, measuredConsorcioIds.has(c.id)).status === 'vencido'
    ).length,
    Próximos: consorcios.filter(
      c => getConsorcioStatus(c, measuredConsorcioIds.has(c.id)).status === 'proximo'
    ).length,
    'Al día': consorcios.filter(
      c => getConsorcioStatus(c, measuredConsorcioIds.has(c.id)).status === 'al_dia'
    ).length,
    'Sin medir': consorcios.filter(
      c =>
        getConsorcioStatus(c, measuredConsorcioIds.has(c.id)).status === 'sin_medir' ||
        !measuredConsorcioIds.has(c.id)
    ).length,
  };

  const filteredData = consorcios.filter(c => {
    const admin = administraciones.find(a => a.id === c.administracion_id);
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.direccion.toLowerCase().includes(q) ||
      c.solicitante.toLowerCase().includes(q) ||
      (admin?.nombre && admin.nombre.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeFilter === 'Ruta del mes') return isRutaDelMes(c);
    const st = getConsorcioStatus(c, measuredConsorcioIds.has(c.id));
    if (activeFilter === 'Vencidos') return st.status === 'vencido';
    if (activeFilter === 'Próximos') return st.status === 'proximo';
    if (activeFilter === 'Al día') return st.status === 'al_dia';
    if (activeFilter === 'Sin medir') return st.status === 'sin_medir' || !measuredConsorcioIds.has(c.id);
    return true;
  });

  const handleCreateConsorcio = () => {
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
    setNewForm({
      direccion: '',
      solicitante: '',
      locacion: '',
      administracion_id: administraciones[0]?.id || 'adm-1',
      nuevaAdminNombre: '',
    });
    setShowNewModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: skin.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: skin.surface, borderColor: skin.border },
        ]}
      >
        <Title style={[styles.headerTitle, { color: skin.textPrimary }]}>
          Padrón de Consorcios
        </Title>
        <Text style={[styles.headerSub, { color: skin.textSecondary }]}>
          Buscá, filtrá por estado o creá un nuevo consorcio.
        </Text>

        <Surface
          style={[
            styles.searchBar,
            { backgroundColor: skin.inputBg, borderColor: skin.border },
          ]}
          elevation={1}
        >
          <Search size={20} color={skin.textSecondary} />
          <TextInput
            placeholder="Buscar por dirección, razón social o administración..."
            style={[styles.input, { color: skin.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={skin.textSecondary}
          />
        </Surface>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 8 }}
        >
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterChip,
                { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                activeFilter === f && {
                  backgroundColor: skin.primary,
                  borderColor: skin.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: skin.textSecondary },
                  activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f} ({filterCounts[f] ?? 0})
              </Text>
            </TouchableOpacity>
          ))}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/importar-masivo')}
              style={[
                styles.filterChip,
                { backgroundColor: skin.headerBg, borderColor: skin.headerBg },
              ]}
            >
              <Text style={[styles.filterText, { color: '#fff' }]}>Importar Excel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <Surface
            style={[
              styles.emptyCard,
              { backgroundColor: skin.cardBg, borderColor: skin.border },
            ]}
            elevation={1}
          >
            <Building2 size={32} color={skin.textSecondary} />
            <Text style={[styles.emptyTitle, { color: skin.textPrimary }]}>
              Sin consorcios en este filtro
            </Text>
            <Text style={[styles.emptySub, { color: skin.textSecondary }]}>
              Probá cambiar el filtro o tocá el botón (+) para dar de alta uno nuevo.
            </Text>
          </Surface>
        }
        renderItem={({ item }) => {
          const hasProtocol = measuredConsorcioIds.has(item.id);
          const status = getConsorcioStatus(item, hasProtocol);
          const adminObj = administraciones.find(a => a.id === item.administracion_id);
          return (
            <Surface
              style={[
                styles.card,
                { backgroundColor: skin.cardBg, borderColor: skin.border },
              ]}
              elevation={1}
            >
              <TouchableOpacity
                style={styles.cardInner}
                onPress={() => router.push({ pathname: '/consorcio/[id]', params: { id: item.id } })}
              >
                <Surface
                  style={[
                    styles.iconBox,
                    { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                  ]}
                  elevation={0}
                >
                  <Building2 size={24} color={skin.textPrimary} />
                </Surface>
                <View style={styles.info}>
                  <Text style={[styles.direccion, { color: skin.textPrimary }]}>
                    {item.direccion}
                  </Text>
                  <Text style={[styles.admin, { color: skin.textSecondary }]}>
                    Admin: {adminObj?.nombre || item.solicitante}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    {!hasProtocol && status.code !== 'sin_medir' && (
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: skin.isDark ? '#451a03' : '#fff7ed' },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: '#D97706' }]}>
                          Sin protocolo
                        </Text>
                      </View>
                    )}
                    {item.vencimiento_proximo && (
                      <Text style={[styles.vencText, { color: skin.textSecondary }]}>
                        Vence: {formatDate(item.vencimiento_proximo)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: skin.primaryLight,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    marginRight: 4,
                  }}
                  onPress={() => router.push({ pathname: '/medicion/nueva', params: { id: item.id } })}
                >
                  <Text style={{ color: skin.primary, fontSize: 11, fontWeight: '900' }}>MEDIR</Text>
                </TouchableOpacity>
                <ChevronRight size={20} color={skin.textSecondary} />
              </TouchableOpacity>
            </Surface>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setNewForm(prev => ({
            ...prev,
            administracion_id: administraciones[0]?.id || 'adm-1',
            nuevaAdminNombre: '',
          }));
          setShowNewModal(true);
        }}
      >
        <Plus size={32} color="#fff" strokeWidth={3} />
      </TouchableOpacity>

      <Modal visible={showNewModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <Surface style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '90%' }} elevation={4}>
            <ScrollView>
              <Title style={{ fontWeight: '900', marginBottom: 4 }}>Nuevo Consorcio</Title>
              <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                El vencimiento anual se calculará automáticamente al registrar su primera medición PAT.
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
                SELECCIONAR ADMINISTRACIÓN
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
                <Button mode="contained" buttonColor="#1F4FFF" onPress={handleCreateConsorcio}>
                  Guardar Consorcio
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
    backgroundColor: '#F1F5F9',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  filterRow: {
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1F4FFF',
    borderColor: '#1F4FFF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  info: {
    flex: 1,
  },
  direccion: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  admin: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  vencText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1F4FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
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
