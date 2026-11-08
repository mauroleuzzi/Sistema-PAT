import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { Surface, Text, Title, Button, TextInput as PaperInput, Divider } from 'react-native-paper';
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
  Image as ImageIcon,
  Plus,
  Edit3,
  Trash2,
  Phone,
  Mail,
  ShieldCheck,
  ClipboardCheck,
  Layers,
  ArrowLeft,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDemo } from '../../src/context/DemoContext';
import { useSkin } from '../../src/context/ThemeContext';
import {
  formatDate,
  formatResistance,
  getConsorcioStatus,
  generateUUID,
  parseFlexibleDateToIso,
} from '../../src/lib/utils';
import { downloadPATReport } from '../../src/services/pdfGenerator';

export default function ConsorcioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { skin } = useSkin();
  const {
    consorcios,
    administraciones,
    mediciones,
    profesionalConfig,
    updateConsorcio,
    deleteConsorcio,
    deleteMedicion,
    addAdministracion,
  } = useDemo();

  const consorcio = consorcios.find(c => c.id === id) || consorcios[0];
  const admin = administraciones.find(a => a.id === consorcio?.administracion_id);

  const historial = mediciones
    .filter(m => m.consorcio_id === consorcio?.id)
    .sort((a, b) => b.fecha_medicion.localeCompare(a.fecha_medicion));

  const [editVisible, setEditVisible] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [form, setForm] = useState({
    direccion: consorcio?.direccion || '',
    solicitante: consorcio?.solicitante || '',
    cuit: consorcio?.cuit || '',
    telefono: consorcio?.telefono || '',
    email: consorcio?.email || '',
    locacion_medicion_default: consorcio?.locacion_medicion_default || '',
    observaciones_base: consorcio?.observaciones_base || '',
    vencimiento_proximo: consorcio?.vencimiento_proximo || '',
    administracion_id: consorcio?.administracion_id || administraciones[0]?.id || 'adm-1',
  });

  if (!consorcio) {
    return (
      <View style={styles.center}>
        <Text>Consorcio no encontrado.</Text>
      </View>
    );
  }

  const statusInfo = getConsorcioStatus(consorcio, historial.length > 0);
  const isExpired = statusInfo.status === 'vencido';

  const handleSaveEdit = () => {
    if (!form.direccion.trim()) {
      Alert.alert('Error', 'La dirección es obligatoria.');
      return;
    }

    let targetAdminId = form.administracion_id;
    if (newAdminName.trim()) {
      const createdId = generateUUID();
      addAdministracion({
        id: createdId,
        nombre: newAdminName.trim(),
      });
      targetAdminId = createdId;
    }

    const cleanedVenc = form.vencimiento_proximo.trim()
      ? parseFlexibleDateToIso(form.vencimiento_proximo.trim(), form.vencimiento_proximo.trim())
      : undefined;

    updateConsorcio(consorcio.id, {
      direccion: form.direccion.trim(),
      solicitante: form.solicitante.trim() || `Consorcio ${form.direccion.trim()}`,
      cuit: form.cuit.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      email: form.email.trim() || undefined,
      locacion_medicion_default: form.locacion_medicion_default.trim() || undefined,
      observaciones_base: form.observaciones_base.trim() || undefined,
      vencimiento_proximo: cleanedVenc,
      administracion_id: targetAdminId,
    });
    setNewAdminName('');
    setEditVisible(false);
    Alert.alert('Actualizado', 'Los datos del consorcio se guardaron correctamente.');
  };

  const handleDeleteConsorcio = () => {
    const msg = `¿Eliminar el consorcio "${consorcio.direccion}" y sus ${historial.length} mediciones asociadas?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        deleteConsorcio(consorcio.id);
        router.replace('/(tabs)/consorcio');
      }
    } else {
      Alert.alert('Eliminar Consorcio', msg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteConsorcio(consorcio.id);
            router.replace('/(tabs)/consorcio');
          },
        },
      ]);
    }
  };

  const handleDeleteMedicion = (medId: string, fechaStr: string) => {
    const msg = `¿Eliminar la medición del ${formatDate(fechaStr)}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        deleteMedicion(medId);
      }
    } else {
      Alert.alert('Eliminar Medición', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMedicion(medId) },
      ]);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: skin.background }]}
      contentContainerStyle={styles.content}
    >
      {/* HERO HEADER */}
      <Surface
        style={[
          styles.heroCard,
          { backgroundColor: skin.cardBg, borderColor: skin.border },
        ]}
        elevation={2}
      >
        <View style={styles.heroTop}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label.toUpperCase()}
              {statusInfo.daysRemaining !== null
                ? statusInfo.daysRemaining < 0
                  ? ` (${Math.abs(statusInfo.daysRemaining)}d vencido)`
                  : ` (${statusInfo.daysRemaining}d)`
                : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: skin.primaryLight }]}
              onPress={() => {
                setForm({
                  direccion: consorcio.direccion || '',
                  solicitante: consorcio.solicitante || '',
                  cuit: consorcio.cuit || '',
                  telefono: consorcio.telefono || '',
                  email: consorcio.email || '',
                  locacion_medicion_default: consorcio.locacion_medicion_default || '',
                  observaciones_base: consorcio.observaciones_base || '',
                  vencimiento_proximo: consorcio.vencimiento_proximo || '',
                  administracion_id: consorcio.administracion_id,
                });
                setNewAdminName('');
                setEditVisible(true);
              }}
            >
              <Edit3 size={15} color={skin.primary} />
              <Text style={[styles.editBtnText, { color: skin.primary }]}>Editar Ficha</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteHeroBtn} onPress={handleDeleteConsorcio}>
              <Trash2 size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroTitleRow}>
          <Surface style={styles.heroIcon} elevation={0}>
            <Building2 size={28} color="#1F4FFF" />
          </Surface>
          <View style={{ flex: 1 }}>
            <Title style={styles.direccion}>{consorcio.direccion}</Title>
            <Text style={styles.solicitante}>{consorcio.solicitante}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.measureCta}
          onPress={() => router.push({ pathname: '/medicion/nueva', params: { id: consorcio.id } })}
        >
          <Plus size={20} color="#fff" strokeWidth={3} />
          <Text style={styles.measureCtaText}>INICIAR NUEVA MEDICIÓN PAT</Text>
        </TouchableOpacity>
      </Surface>

      {/* FICHA TÉCNICA Y ADMINISTRACIÓN */}
      <Text style={styles.sectionLabel}>FICHA TÉCNICA Y ADMINISTRACIÓN</Text>
      <Surface style={styles.infoCard} elevation={1}>
        <View style={styles.infoRow}>
          <ShieldCheck size={18} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>ADMINISTRACIÓN RESPONSABLE</Text>
            <Text style={styles.infoValue}>{admin?.nombre || 'Sin administración asignada'}</Text>
            {admin?.contacto && <Text style={styles.infoSub}>Contacto: {admin.contacto}</Text>}
            {admin?.email && <Text style={styles.infoSub}>Email Admin: {admin.email}</Text>}
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoRow}>
          <MapPin size={18} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>LOCACIÓN DE MEDICIÓN POR DEFECTO</Text>
            <Text style={styles.infoValue}>
              {consorcio.locacion_medicion_default || 'Tablero Principal Planta Baja'}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoRow}>
          <Calendar size={18} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>PRÓXIMO VENCIMIENTO ANUAL</Text>
            <Text style={[styles.infoValue, isExpired && { color: '#DC2626' }]}>
              {consorcio.vencimiento_proximo ? formatDate(consorcio.vencimiento_proximo) : 'Pendiente de primera medición'}
            </Text>
          </View>
        </View>

        {(consorcio.cuit || consorcio.telefono || consorcio.email) && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.contactGrid}>
              {consorcio.cuit && (
                <Text style={styles.infoSub}>CUIT: <Text style={styles.bold}>{consorcio.cuit}</Text></Text>
              )}
              {consorcio.telefono && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#64748b" />
                  <Text style={styles.infoSub}>{consorcio.telefono}</Text>
                </View>
              )}
              {consorcio.email && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} color="#64748b" />
                  <Text style={styles.infoSub}>{consorcio.email}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {consorcio.observaciones_base && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.infoLabel}>OBSERVACIONES BASE</Text>
            <Text style={[styles.infoSub, { marginTop: 4 }]}>{consorcio.observaciones_base}</Text>
          </>
        )}
      </Surface>

      {/* HISTORIAL DE MEDICIONES */}
      <Text style={styles.sectionLabel}>
        HISTORIAL DE PROTOCOLOS ({historial.length})
      </Text>

      {historial.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <ClipboardCheck size={36} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Sin mediciones registradas</Text>
          <Text style={styles.emptySub}>
            Aún no se han emitido protocolos PAT para este consorcio.
          </Text>
        </Surface>
      ) : (
        historial.map(item => (
          <Surface key={item.id} style={styles.medCard} elevation={1}>
            <View style={styles.medHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medDate}>Medición del {formatDate(item.fecha_medicion)}</Text>
                <Text style={styles.medLoc}>{item.locacion || 'Tablero Principal'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.ohmBadge}>
                  <Text style={styles.ohmText}>{formatResistance(item.resultado)} Ω</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/medicion/nueva',
                      params: { id: consorcio.id, medicionId: item.id },
                    })
                  }
                >
                  <Edit3 size={15} color="#1F4FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: '#fee2e2' }]}
                  onPress={() => handleDeleteMedicion(item.id, item.fecha_medicion)}
                >
                  <Trash2 size={15} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>

            {item.observaciones && (
              <Text style={styles.medObs} numberOfLines={2}>
                Obs: {item.observaciones}
              </Text>
            )}

            {/* Botón Principal: Informe Completo (Protocolo + Fotos) */}
            <TouchableOpacity
              style={styles.fullPdfBtn}
              onPress={() => downloadPATReport(item, consorcio, 'full', profesionalConfig)}
            >
              <Layers size={15} color="#fff" strokeWidth={2.5} />
              <Text style={styles.fullPdfBtnText}>INFORME COMPLETO PDF (PROTOCOLO + FOTOS)</Text>
            </TouchableOpacity>

            <View style={styles.pdfActions}>
              <TouchableOpacity
                style={[styles.pdfBtn, styles.pdfBtnOutline]}
                onPress={() => downloadPATReport(item, consorcio, 'protocol', profesionalConfig)}
              >
                <FileText size={14} color="#1F4FFF" strokeWidth={2.5} />
                <Text style={[styles.pdfBtnText, { color: '#1F4FFF' }]}>SOLO PROTOCOLO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pdfBtn, styles.pdfBtnOutline]}
                onPress={() => downloadPATReport(item, consorcio, 'photos', profesionalConfig)}
              >
                <ImageIcon size={14} color="#0f172a" strokeWidth={2.5} />
                <Text style={[styles.pdfBtnText, { color: '#0f172a' }]}>SOLO FOTOS</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        ))
      )}

      {/* MODAL DE EDICIÓN */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalCard} elevation={5}>
            <ScrollView>
              <Title style={{ fontWeight: '900', marginBottom: 12 }}>Editar Ficha de Consorcio</Title>
              <PaperInput
                label="Dirección *"
                mode="outlined"
                value={form.direccion}
                onChangeText={t => setForm(prev => ({ ...prev, direccion: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Solicitante / Razón Social"
                mode="outlined"
                value={form.solicitante}
                onChangeText={t => setForm(prev => ({ ...prev, solicitante: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Locación de medición por defecto"
                mode="outlined"
                value={form.locacion_medicion_default}
                onChangeText={t => setForm(prev => ({ ...prev, locacion_medicion_default: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Próximo Vencimiento (AAAA-MM-DD)"
                mode="outlined"
                value={form.vencimiento_proximo}
                onChangeText={t => setForm(prev => ({ ...prev, vencimiento_proximo: t }))}
                style={styles.input}
              />
              <PaperInput
                label="CUIT"
                mode="outlined"
                value={form.cuit}
                onChangeText={t => setForm(prev => ({ ...prev, cuit: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Teléfono"
                mode="outlined"
                value={form.telefono}
                onChangeText={t => setForm(prev => ({ ...prev, telefono: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Email"
                mode="outlined"
                value={form.email}
                onChangeText={t => setForm(prev => ({ ...prev, email: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Observaciones Base"
                mode="outlined"
                multiline
                value={form.observaciones_base}
                onChangeText={t => setForm(prev => ({ ...prev, observaciones_base: t }))}
                style={styles.input}
              />

              <Text style={[styles.infoLabel, { marginTop: 4, marginBottom: 8 }]}>
                ADMINISTRACIÓN ASIGNADA
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {administraciones.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => {
                      setForm(prev => ({ ...prev, administracion_id: a.id }));
                      setNewAdminName('');
                    }}
                    style={[
                      styles.adminChip,
                      form.administracion_id === a.id && !newAdminName.trim() && styles.adminChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.adminChipText,
                        form.administracion_id === a.id && !newAdminName.trim() && { color: '#fff' },
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
                value={newAdminName}
                onChangeText={setNewAdminName}
                style={styles.input}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <Button onPress={() => setEditVisible(false)}>Cancelar</Button>
                <Button mode="contained" buttonColor="#1F4FFF" onPress={handleSaveEdit}>
                  Guardar Cambios
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  editBtnText: { fontSize: 12, fontWeight: '800', color: '#1F4FFF' },
  deleteHeroBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  direccion: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  solicitante: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  measureCta: {
    backgroundColor: '#1F4FFF',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  measureCtaText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.8 },
  infoValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  infoSub: { fontSize: 13, color: '#475569', fontWeight: '600', marginTop: 2 },
  bold: { fontWeight: '800', color: '#0f172a' },
  divider: { marginVertical: 14, backgroundColor: '#E2E8F0' },
  contactGrid: { gap: 6 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  medCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  medDate: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  medLoc: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
  ohmBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ohmText: { fontSize: 14, fontWeight: '900', color: '#1F4FFF' },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medObs: { fontSize: 12, color: '#475569', marginBottom: 12, fontStyle: 'italic' },
  fullPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F4FFF',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  fullPdfBtnText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  pdfActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  pdfBtnText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  pdfBtnOutline: { borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  input: { marginBottom: 10, backgroundColor: '#fff' },
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
