import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Surface, Text, IconButton } from 'react-native-paper';
import {
  FileText,
  ClipboardCheck,
  Calendar,
  Search,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Files,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate, formatResistance } from '../../../src/lib/utils';
import { useDemo } from '../../../src/context/DemoContext';
import { useSkin } from '../../../src/context/ThemeContext';
import { downloadPATReport, PATReportType } from '../../../src/services/pdfGenerator';

export default function Mediciones() {
  const router = useRouter();
  const { mediciones, consorcios, administraciones, profesionalConfig, deleteMedicion, updateMedicion } = useDemo();
  const { skin } = useSkin();
  const [filterType, setFilterType] = useState<'Año' | 'Consorcio' | 'Administración'>('Año');
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'aprobados'>('todos');
  const [searchText, setSearchText] = useState('');
  const availableYears = React.useMemo(() => {
    const yearSet = new Set<string>(['2026', '2025', '2024']);
    mediciones.forEach((m: any) => {
      if (m.fecha_medicion && String(m.fecha_medicion).length >= 4) {
        yearSet.add(String(m.fecha_medicion).substring(0, 4));
      }
    });
    return ['Todos', ...Array.from(yearSet).sort((a, b) => b.localeCompare(a))];
  }, [mediciones]);

  const handleDownload = async (
    medicion: any,
    type: PATReportType,
    encomiendaMode?: 'con_encomienda' | 'sin_encomienda'
  ) => {
    const consorcio = consorcios.find((c: any) => c.id === medicion.consorcio_id) || {
      id: medicion.consorcio_id,
      direccion: 'SIN DIRECCIÓN',
      solicitante: 'Consorcio',
      administracion_id: '',
      activo: true,
    };
    await downloadPATReport(medicion, consorcio, type, profesionalConfig, { encomiendaMode });
  };

  const handleDeleteMedicion = (item: any, consorcioName: string) => {
    const msg = `¿Eliminar la medición de ${consorcioName} (${formatResistance(item.resultado)} Ω)?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        deleteMedicion(item.id);
      }
    } else {
      Alert.alert('Eliminar Medición', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMedicion(item.id) },
      ]);
    }
  };

  const pendingCount = mediciones.filter(
    (m: any) => m.estado !== 'aprobado' && m.estado !== 'pdf_generado'
  ).length;
  const approvedCount = mediciones.filter(
    (m: any) => m.estado === 'aprobado' || m.estado === 'pdf_generado'
  ).length;

  const filteredData = mediciones.filter((m: any) => {
    const consorcio = consorcios.find((c: any) => c.id === m.consorcio_id);
    const admin = administraciones.find((a: any) => a.id === consorcio?.administracion_id);
    const year = m.fecha_medicion ? String(m.fecha_medicion).substring(0, 4) : '';
    const q = searchText.toLowerCase().trim();

    const matchesYear = selectedYear === 'Todos' || year === selectedYear;
    if (!matchesYear) return false;

    const isApproved = m.estado === 'aprobado' || m.estado === 'pdf_generado';
    if (statusFilter === 'pendientes' && isApproved) return false;
    if (statusFilter === 'aprobados' && !isApproved) return false;

    if (!q) return true;

    if (filterType === 'Administración') {
      return Boolean(admin?.nombre.toLowerCase().includes(q));
    }
    return Boolean(
      consorcio?.direccion.toLowerCase().includes(q) ||
        consorcio?.solicitante.toLowerCase().includes(q) ||
        (m.locacion && String(m.locacion).toLowerCase().includes(q)) ||
        admin?.nombre.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: skin.background }]}>
      <Surface
        style={[
          styles.filterHeader,
          { backgroundColor: skin.surface, borderColor: skin.border },
        ]}
        elevation={1}
      >
        <View style={[styles.SegmentedControl, { backgroundColor: skin.surfaceAlt }]}>
          {(['Año', 'Consorcio', 'Administración'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setFilterType(t);
              }}
              style={[
                styles.segment,
                filterType === t && [styles.segmentActive, { backgroundColor: skin.cardBg }],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: skin.textSecondary },
                  filterType === t && { color: skin.primary },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chips de Estado de Revisión (Flujo Campo vs Oficina) */}
        <View style={styles.statusChipsRow}>
          {(
            [
              { id: 'todos', label: `Todos (${mediciones.length})` },
              { id: 'pendientes', label: `⏳ Pendientes (${pendingCount})` },
              { id: 'aprobados', label: `✅ Aprobados (${approvedCount})` },
            ] as const
          ).map(st => (
            <TouchableOpacity
              key={st.id}
              onPress={() => setStatusFilter(st.id)}
              style={[
                styles.statusChip,
                { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                statusFilter === st.id && {
                  backgroundColor: skin.primary,
                  borderColor: skin.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  { color: skin.textSecondary },
                  statusFilter === st.id && { color: '#fff', fontWeight: '800' },
                ]}
              >
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.yearRow, { marginBottom: 10 }]}>
          <Calendar size={18} color={skin.primary} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingLeft: 8 }}
          >
            {availableYears.map(y => (
              <TouchableOpacity
                key={y}
                onPress={() => setSelectedYear(y)}
                style={[
                  styles.yearPill,
                  { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                  selectedYear === y && {
                    backgroundColor: skin.primary,
                    borderColor: skin.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.yearText,
                    { color: skin.textSecondary },
                    selectedYear === y && styles.yearTextActive,
                  ]}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Surface
          style={[
            styles.searchBar,
            { backgroundColor: skin.inputBg, borderColor: skin.border },
          ]}
          elevation={0}
        >
          <Search size={18} color={skin.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: skin.textPrimary }]}
            placeholder={
              filterType === 'Administración'
                ? 'Filtrar por administración...'
                : 'Buscar por consorcio, locación o administración...'
            }
            placeholderTextColor={skin.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <IconButton icon="close" size={20} onPress={() => setSearchText('')} />
          )}
        </Surface>
      </Surface>

      <FlatList
        data={filteredData}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListEmptyComponent={
          <Surface
            style={[
              styles.emptyBox,
              { backgroundColor: skin.cardBg, borderColor: skin.border, borderWidth: 1 },
            ]}
            elevation={1}
          >
            <ClipboardCheck size={40} color={skin.textSecondary} />
            <Text style={[styles.emptyTitle, { color: skin.textPrimary }]}>
              No hay mediciones para este filtro
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: skin.primary }]}
              onPress={() => router.push('/medicion/select')}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>REGISTRAR NUEVA MEDICIÓN</Text>
            </TouchableOpacity>
          </Surface>
        }
        renderItem={({ item }: { item: any }) => {
          const consorcio = consorcios.find((c: any) => c.id === item.consorcio_id);
          const adminObj = administraciones.find((a: any) => a.id === consorcio?.administracion_id);
          const dirName = consorcio?.direccion || 'Consorcio';
          const isApproved = item.estado === 'aprobado' || item.estado === 'pdf_generado';
          const hasMultiplePoints = item.puntos_medicion && item.puntos_medicion.length > 1;

          return (
            <Surface
              style={[
                styles.card,
                { backgroundColor: skin.cardBg, borderColor: skin.border },
              ]}
              elevation={1}
            >
              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <Surface
                    style={[
                      styles.iconBox,
                      { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                    ]}
                    elevation={0}
                  >
                    <ClipboardCheck size={24} color={skin.textPrimary} />
                  </Surface>
                  <TouchableOpacity
                    style={styles.info}
                    onPress={() =>
                      consorcio
                        ? router.push({ pathname: '/consorcio/[id]', params: { id: consorcio.id } })
                        : undefined
                    }
                  >
                    <Text style={[styles.direccion, { color: skin.textPrimary }]}>{dirName}</Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.fecha, { color: skin.textSecondary }]}>
                        {formatDate(item.fecha_medicion)}
                      </Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={[styles.resultado, { color: skin.primary }]}>
                        {formatResistance(item.resultado)} Ω
                      </Text>
                    </View>
                    <Text style={[styles.locacionSub, { color: skin.textSecondary }]} numberOfLines={1}>
                      {item.locacion || 'Tablero Principal'}
                      {adminObj?.nombre ? ` • ${adminObj.nombre}` : ''}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.crudActions}>
                    <TouchableOpacity
                      style={[styles.iconActionBtn, { backgroundColor: skin.primaryLight }]}
                      onPress={() =>
                        router.push({
                          pathname: '/medicion/nueva',
                          params: { id: item.consorcio_id, medicionId: item.id },
                        })
                      }
                    >
                      <Edit3 size={17} color={skin.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.iconActionBtn,
                        { backgroundColor: skin.isDark ? '#450a0a' : '#fee2e2' },
                      ]}
                      onPress={() => handleDeleteMedicion(item, dirName)}
                    >
                      <Trash2 size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Badges de Estado de Revisión y Salida Dual */}
                <View style={styles.cardStatusRow}>
                  {isApproved ? (
                    <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                      <CheckCircle2 size={12} color="#16a344" />
                      <Text style={[styles.statusBadgeText, { color: '#16a344' }]}>
                        APROBADO PARA EMISIÓN LEGAL
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                      <Clock size={12} color="#b45309" />
                      <Text style={[styles.statusBadgeText, { color: '#b45309' }]}>
                        BORRADOR • PENDIENTE DE CONTROL
                      </Text>
                    </View>
                  )}
                  {hasMultiplePoints && (
                    <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                      <Text style={[styles.statusBadgeText, { color: '#475569' }]}>
                        {item.puntos_medicion.length} JABALINAS
                      </Text>
                    </View>
                  )}
                </View>

                {/* Acción de Aprobación en PC / Oficina */}
                {!isApproved && (
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: '#16a344' }]}
                    onPress={() => {
                      updateMedicion(item.id, { estado: 'aprobado' });
                      if (Platform.OS === 'web') {
                        window.alert('✅ Medición aprobada. Ya puede emitir el protocolo legal sin marca de agua.');
                      } else {
                        Alert.alert('Protocolo Aprobado', 'La medición fue aprobada y queda lista para emisión legal.');
                      }
                    }}
                  >
                    <CheckCircle2 size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.approveBtnText}>APROBAR Y EMITIR PROTOCOLO (OFICINA)</Text>
                  </TouchableOpacity>
                )}

                {/* Salida Dual PDF: Con Encomienda vs Sin Encomienda */}
                <View style={{ gap: 6, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.fullReportBtn, { backgroundColor: skin.primary }]}
                    onPress={() => handleDownload(item, 'full', 'con_encomienda')}
                  >
                    <Files size={15} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.fullReportBtnText}>
                      PROTOCOLO OFICIAL (CON ENCOMIENDA COPIME)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.fullReportBtn,
                      { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
                    ]}
                    onPress={() => handleDownload(item, 'full', 'sin_encomienda')}
                  >
                    <FileText size={15} color="#93c5fd" strokeWidth={2.5} />
                    <Text style={[styles.fullReportBtnText, { color: '#93c5fd' }]}>
                      CERTIFICADO TÉCNICO (SIN ENCOMIENDA)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Botones secundarios */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[
                      styles.pdfBtn,
                      styles.borderOutline,
                      { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                    ]}
                    onPress={() => handleDownload(item, 'photos')}
                  >
                    <ImageIcon size={14} color={skin.textPrimary} strokeWidth={2.5} />
                    <Text style={[styles.pdfBtnText, { color: skin.textPrimary }]}>SOLO FOTOS</Text>
                  </TouchableOpacity>
                  {isApproved && (
                    <TouchableOpacity
                      style={[
                        styles.pdfBtn,
                        styles.borderOutline,
                        { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
                      ]}
                      onPress={() => {
                        updateMedicion(item.id, { estado: 'borrador' });
                      }}
                    >
                      <Clock size={14} color={skin.textSecondary} strokeWidth={2.5} />
                      <Text style={[styles.pdfBtnText, { color: skin.textSecondary }]}>
                        VOLVER A BORRADOR
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Surface>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  filterHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  SegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: '#fff', elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  segmentTextActive: { color: '#1F4FFF' },
  yearRow: { flexDirection: 'row', alignItems: 'center' },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearPillActive: { backgroundColor: '#1F4FFF', borderColor: '#1F4FFF' },
  yearText: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  yearTextActive: { color: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardInner: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  info: { flex: 1 },
  direccion: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  fecha: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  dot: { marginHorizontal: 6, color: '#cbd5e1' },
  resultado: { fontSize: 14, color: '#1F4FFF', fontWeight: '900' },
  locacionSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  crudActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullReportBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1F4FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fullReportBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  cardFooter: { flexDirection: 'row', gap: 8 },
  pdfBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pdfBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  borderOutline: { borderWidth: 1.5, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: '#1F4FFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
});
