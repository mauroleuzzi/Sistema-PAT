import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { Text, Title, Surface, Button, TextInput as PaperInput, Switch, Divider } from 'react-native-paper';
import {
  Clock,
  Settings,
  ChevronRight,
  PieChart,
  Users,
  FileSpreadsheet,
  Layout,
  CloudUpload,
  RotateCcw,
  Download,
  Building2,
  Trash2,
  Plus,
  Edit3,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useDemo } from '../../../src/context/DemoContext';
import { useAuth } from '../../../src/context/AuthContext';
import { useSkin } from '../../../src/context/ThemeContext';
import { exportToExcel } from '../../../src/services/excelService';
import { useSync } from '../../../src/hooks/useSync';
import {
  getSupabaseConfig,
  updateSupabaseConfig,
  checkSupabaseConnection,
} from '../../../src/lib/supabase';

export default function Admin() {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const { skin, setSkinModalVisible } = useSkin();
  const {
    consorcios,
    mediciones,
    administraciones,
    profesionalConfig,
    updateProfesionalConfig,
    updateMedicion,
    addAdministracion,
    updateAdministracion,
    deleteAdministracion,
    resetDemoData,
    clearAllData,
  } = useDemo();
  const { isSyncing, syncData } = useSync();

  // Modal Profesional & Instrumento
  const [profModalVisible, setProfModalVisible] = useState(false);
  const [profForm, setProfForm] = useState({ ...profesionalConfig });

  // Modal Administraciones (Clientes)
  const [adminListModalVisible, setAdminListModalVisible] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({ nombre: '', email: '', telefono: '', contacto: '' });

  // Modal Supabase & Sync
  const [supaModalVisible, setSupaModalVisible] = useState(false);
  const [supaForm, setSupaForm] = useState(() => getSupabaseConfig());
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<string | null>(null);

  const pendingSyncCount = mediciones.filter(
    m => m.sync_status === 'pending'
  ).length;

  const handleExportConsorcios = async () => {
    try {
      const rows = consorcios.map(c => ({
        ID: c.id,
        Direccion: c.direccion,
        Solicitante: c.solicitante,
        Administracion: administraciones.find(a => a.id === c.administracion_id)?.nombre || '',
        Locacion_Default: c.locacion_medicion_default || '',
        Proximo_Vencimiento: c.vencimiento_proximo || '',
        Activo: c.activo ? 'SI' : 'NO',
      }));
      await exportToExcel(rows, 'padron_consorcios_pat.xlsx');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo exportar.');
    }
  };

  const handleFullJsonBackup = async () => {
    try {
      const backupPayload = {
        timestamp: new Date().toISOString(),
        profesionalConfig,
        administraciones,
        consorcios,
        mediciones,
      };
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const fileName = `backup_pat_${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const uri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;
        await FileSystem.writeAsStringAsync(uri, jsonStr, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        }
      }
    } catch (e: any) {
      Alert.alert('Error en Backup', e.message || 'No se pudo generar el archivo JSON.');
    }
  };

  const handlePickSignature = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const uri = asset.base64
          ? `data:image/png;base64,${asset.base64}`
          : asset.uri;
        setProfForm(prev => ({ ...prev, firmaUrl: uri }));
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen de firma.');
    }
  };

  const handleSaveProfConfig = () => {
    if (!profForm.nombre.trim() || !profForm.matricula.trim()) {
      Alert.alert('Campos obligatorios', 'El nombre del profesional y la matrícula son obligatorios.');
      return;
    }
    updateProfesionalConfig({
      nombre: profForm.nombre.trim(),
      matricula: profForm.matricula.trim(),
      entidad: profForm.entidad.trim() || 'COPIME',
      instrumento: profForm.instrumento.trim() || 'SONEL MPI-530',
      metodo: profForm.metodo.trim(),
      jurisdiccion: profForm.jurisdiccion.trim(),
      jurisdiccionCorta: profForm.jurisdiccionCorta.trim(),
      firmaUrl: profForm.firmaUrl,
    });
    setProfModalVisible(false);
    Alert.alert('Guardado', 'Los datos del profesional e instrumento se aplicarán a todos los PDFs.');
  };

  const handleCreateAdmin = () => {
    if (!newAdminForm.nombre.trim()) {
      Alert.alert('Obligatorio', 'Ingrese el nombre de la Administración.');
      return;
    }
    if (editingAdminId) {
      updateAdministracion(editingAdminId, {
        nombre: newAdminForm.nombre.trim(),
        email: newAdminForm.email.trim() || undefined,
        telefono: newAdminForm.telefono.trim() || undefined,
        contacto: newAdminForm.contacto.trim() || undefined,
      });
      setEditingAdminId(null);
    } else {
      addAdministracion({
        id: `adm-${Date.now()}`,
        nombre: newAdminForm.nombre.trim(),
        email: newAdminForm.email.trim() || undefined,
        telefono: newAdminForm.telefono.trim() || undefined,
        contacto: newAdminForm.contacto.trim() || undefined,
      });
    }
    setNewAdminForm({ nombre: '', email: '', telefono: '', contacto: '' });
  };

  const handleTestSupabase = async () => {
    setTestingConn(true);
    setConnStatus(null);
    const res = await checkSupabaseConnection(supaForm.url, supaForm.anonKey);
    setTestingConn(false);
    setConnStatus(res.statusMessage);
  };

  const handleSaveSupabaseConfig = () => {
    updateSupabaseConfig(supaForm);
    setSupaModalVisible(false);
    Alert.alert(
      'Configuración Guardada',
      supaForm.isDemoMode
        ? 'Modo Local / Offline-First activo.'
        : 'Modo Nube (Supabase) activado.'
    );
  };

  const handleRunSync = async () => {
    const res = await syncData({
      mediciones,
      consorcios,
      administraciones,
      onMedicionSynced: (id, updates) => updateMedicion(id, updates),
    });
    Alert.alert(res.ok ? 'Sincronización' : 'Estado de Sincronización', res.message);
  };

  const AdminCard = ({ title, subtitle, icon: Icon, onPress, badgeText, danger }: any) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface
        style={[
          styles.card,
          { backgroundColor: skin.cardBg, borderColor: skin.border },
        ]}
        elevation={1}
      >
        <View style={styles.cardInner}>
          <Surface
            style={[
              styles.iconBox,
              { backgroundColor: danger ? (skin.isDark ? '#450a0a' : '#fee2e2') : skin.primaryLight },
            ]}
            elevation={0}
          >
            <Icon size={22} color={danger ? '#DC2626' : skin.primary} />
          </Surface>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: danger ? '#DC2626' : skin.textPrimary }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.cardSub, { color: skin.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
          {badgeText && (
            <View style={[styles.badge, { backgroundColor: skin.primaryLight }]}>
              <Text style={[styles.badgeText, { color: skin.primary }]}>{badgeText}</Text>
            </View>
          )}
          <ChevronRight size={18} color={skin.textSecondary} />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: skin.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Tarjeta de Sesión Activa */}
      <Surface
        style={[
          styles.card,
          { marginBottom: 24, padding: 16, backgroundColor: skin.cardBg, borderColor: skin.border },
        ]}
        elevation={1}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: skin.primary, letterSpacing: 1 }}>
              SESIÓN ACTIVA ({isAdmin ? 'ADMINISTRADOR' : 'TÉCNICO OPERATIVO'})
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: skin.textPrimary, marginTop: 2 }}>
              {user?.nombre || 'Usuario PAT'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: skin.textSecondary }}>
              {user?.email || 'Sin correo'}
            </Text>
          </View>
          <Button
            mode="outlined"
            textColor="#DC2626"
            style={{ borderColor: '#fecaca' }}
            onPress={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            Cerrar Sesión
          </Button>
        </View>
      </Surface>

      {/* APARIENCIA Y SKINS VISUALES */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: skin.textSecondary }]}>
          APARIENCIA Y MODO DE CAMPO (SKINS)
        </Text>
        <AdminCard
          title="Modo Visual / Skin de la App"
          subtitle={`Activo: ${skin.name} • Tocá para alternar Modo Noche, Luz Solar o Corporativo`}
          badgeText={skin.shortLabel.toUpperCase()}
          icon={skin.isDark ? Moon : Sun}
          onPress={() => setSkinModalVisible(true)}
        />
      </View>

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GESTIÓN DE CLIENTES Y PADRÓN (SOLO ADMIN)</Text>
          <AdminCard
            title="Gestionar Administraciones (Clientes)"
            subtitle={`${administraciones.length} administraciones registradas`}
            icon={Building2}
            onPress={() => setAdminListModalVisible(true)}
          />
          <AdminCard
            title="Importación Masiva (Excel)"
            subtitle="Cargar y actualizar padrón de consorcios (.xlsx)"
            icon={FileSpreadsheet}
            onPress={() => router.push('/importar-masivo')}
          />
          <AdminCard
            title="Exportar Padrón a Excel"
            subtitle={`Descargar los ${consorcios.length} consorcios actuales`}
            icon={PieChart}
            onPress={handleExportConsorcios}
          />
          <AdminCard
            title="Backup Completo (JSON)"
            subtitle="Respaldar consorcios, mediciones y configuración"
            icon={Download}
            onPress={handleFullJsonBackup}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CERTIFICACIÓN Y VENCIMIENTOS</Text>
        {isAdmin && (
          <AdminCard
            title="Profesional e Instrumento (PDF)"
            subtitle={`${profesionalConfig.nombre} • Mat. ${profesionalConfig.matricula} • ${profesionalConfig.instrumento}`}
            icon={Users}
            onPress={() => {
              setProfForm({ ...profesionalConfig });
              setProfModalVisible(true);
            }}
          />
        )}
        <AdminCard
          title="Protocolos Emitidos"
          subtitle={`Ver y descargar los ${mediciones.length} certificados`}
          icon={Layout}
          onPress={() => router.push('/(tabs)/medicion')}
        />
        <AdminCard
          title="Calendario Maestro"
          subtitle="Ver todos los vencimientos por mes y administración"
          icon={Clock}
          onPress={() => router.push('/(tabs)/calendario')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SINCRONIZACIÓN Y MANTENIMIENTO</Text>
        <AdminCard
          title="Sincronizar con Supabase"
          subtitle={
            isSyncing
              ? 'Sincronizando datos...'
              : `${pendingSyncCount} mediciones locales listas para subir`
          }
          badgeText={pendingSyncCount > 0 ? `${pendingSyncCount} PEND.` : 'AL DÍA'}
          icon={CloudUpload}
          onPress={handleRunSync}
        />
        {isAdmin && (
          <>
            <AdminCard
              title="Conexión Supabase y Modo Offline"
              subtitle={`Modo actual: ${supaForm.isDemoMode ? 'Local Persistente (Offline-First)' : 'Nube Supabase'}`}
              icon={Settings}
              onPress={() => {
                setSupaForm(getSupabaseConfig());
                setConnStatus(null);
                setSupaModalVisible(true);
              }}
            />
            <AdminCard
              title="Restaurar Datos Demo de Fábrica"
              subtitle="Reiniciar los 20 consorcios de ejemplo iniciales"
              icon={RotateCcw}
              onPress={() => {
                if (Platform.OS === 'web') {
                  if (window.confirm('¿Restaurar todos los datos a los valores iniciales de demostración?')) {
                    resetDemoData();
                  }
                } else {
                  Alert.alert(
                    'Restaurar Datos',
                    '¿Desea reiniciar los datos locales a los valores iniciales de demostración?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Restaurar', style: 'destructive', onPress: resetDemoData },
                    ]
                  );
                }
              }}
            />
            <AdminCard
              title="Vaciar Datos de Prueba (Empezar de Cero)"
              subtitle="Limpiar todos los consorcios y mediciones locales para producción real"
              icon={Trash2}
              danger
              onPress={() => {
                const msg =
                  '¿Vaciar todos los consorcios y mediciones de prueba de este dispositivo para comenzar de cero con tus propios edificios?';
                if (Platform.OS === 'web') {
                  if (window.confirm(msg)) {
                    clearAllData();
                  }
                } else {
                  Alert.alert('Empezar de Cero', msg, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Vaciar Todo', style: 'destructive', onPress: clearAllData },
                  ]);
                }
              }}
            />
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Sistema PAT v2.0 PRO</Text>
        <Text style={styles.footerSub}>Sincronización Cloud Supabase + Offline-First</Text>
      </View>

      {/* MODAL 1: CONFIGURACIÓN DEL PROFESIONAL E INSTRUMENTO */}
      <Modal visible={profModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalCard} elevation={5}>
            <ScrollView>
              <Title style={styles.modalTitle}>Profesional e Instrumento PDF</Title>
              <Text style={styles.modalSub}>
                Estos datos se imprimen automáticamente en el Protocolo Técnico y en el Anexo Fotográfico.
              </Text>

              <PaperInput
                label="Nombre del Profesional *"
                mode="outlined"
                value={profForm.nombre}
                onChangeText={t => setProfForm(prev => ({ ...prev, nombre: t }))}
                style={styles.input}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PaperInput
                  label="Matrícula *"
                  mode="outlined"
                  value={profForm.matricula}
                  onChangeText={t => setProfForm(prev => ({ ...prev, matricula: t }))}
                  style={[styles.input, { flex: 1 }]}
                />
                <PaperInput
                  label="Consejo / Entidad"
                  mode="outlined"
                  value={profForm.entidad}
                  onChangeText={t => setProfForm(prev => ({ ...prev, entidad: t }))}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <PaperInput
                label="Instrumento Utilizado"
                mode="outlined"
                value={profForm.instrumento}
                onChangeText={t => setProfForm(prev => ({ ...prev, instrumento: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Método de Medición (Norma IRAM)"
                mode="outlined"
                value={profForm.metodo}
                onChangeText={t => setProfForm(prev => ({ ...prev, metodo: t }))}
                style={styles.input}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PaperInput
                  label="Jurisdicción (Lugar y Fecha)"
                  mode="outlined"
                  value={profForm.jurisdiccion}
                  onChangeText={t => setProfForm(prev => ({ ...prev, jurisdiccion: t }))}
                  style={[styles.input, { flex: 2 }]}
                />
                <PaperInput
                  label="Abrev."
                  mode="outlined"
                  value={profForm.jurisdiccionCorta}
                  onChangeText={t => setProfForm(prev => ({ ...prev, jurisdiccionCorta: t }))}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              <View style={styles.sigRow}>
                <Button mode="outlined" onPress={handlePickSignature} style={{ flex: 1 }}>
                  {profForm.firmaUrl ? 'Cambiar Imagen de Firma' : 'Subir Firma Digital'}
                </Button>
                {profForm.firmaUrl ? (
                  <Button
                    mode="text"
                    textColor="#DC2626"
                    onPress={() => setProfForm(prev => ({ ...prev, firmaUrl: '' }))}
                  >
                    Usar Vectorial
                  </Button>
                ) : null}
              </View>

              <View style={styles.modalActions}>
                <Button onPress={() => setProfModalVisible(false)}>Cancelar</Button>
                <Button mode="contained" buttonColor="#1F4FFF" onPress={handleSaveProfConfig}>
                  Guardar
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>

      {/* MODAL 2: GESTIÓN DE ADMINISTRACIONES (CLIENTES) */}
      <Modal visible={adminListModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalCard} elevation={5}>
            <ScrollView>
              <Title style={styles.modalTitle}>Administraciones (Clientes)</Title>
              <Text style={styles.modalSub}>
                Agregá o eliminá administraciones de consorcios.
              </Text>

              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#1F4FFF', marginBottom: 8 }}>
                  {editingAdminId ? 'EDITANDO ADMINISTRACIÓN' : 'NUEVA ADMINISTRACIÓN'}
                </Text>
                <PaperInput
                  label="Nombre de la Administración *"
                  mode="outlined"
                  value={newAdminForm.nombre}
                  onChangeText={t => setNewAdminForm(prev => ({ ...prev, nombre: t }))}
                  style={styles.input}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <PaperInput
                    label="Contacto"
                    mode="outlined"
                    value={newAdminForm.contacto}
                    onChangeText={t => setNewAdminForm(prev => ({ ...prev, contacto: t }))}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <PaperInput
                    label="Teléfono"
                    mode="outlined"
                    value={newAdminForm.telefono}
                    onChangeText={t => setNewAdminForm(prev => ({ ...prev, telefono: t }))}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <PaperInput
                  label="Email"
                  mode="outlined"
                  value={newAdminForm.email}
                  onChangeText={t => setNewAdminForm(prev => ({ ...prev, email: t }))}
                  style={styles.input}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {editingAdminId && (
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setEditingAdminId(null);
                        setNewAdminForm({ nombre: '', email: '', telefono: '', contacto: '' });
                      }}
                    >
                      Cancelar Edición
                    </Button>
                  )}
                  <Button
                    mode="contained"
                    buttonColor="#1F4FFF"
                    style={{ flex: 1 }}
                    onPress={handleCreateAdmin}
                  >
                    {editingAdminId ? 'Guardar Cambios' : '+ Agregar Administración'}
                  </Button>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', marginBottom: 8 }}>
                LISTADO ACTUAL ({administraciones.length})
              </Text>
              {administraciones.map(adm => {
                const countCons = consorcios.filter(c => c.administracion_id === adm.id).length;
                return (
                  <View
                    key={adm.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E2E8F0',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a' }}>
                        {adm.nombre}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>
                        {countCons} consorcios asignados {adm.email ? `• ${adm.email}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => {
                          setEditingAdminId(adm.id);
                          setNewAdminForm({
                            nombre: adm.nombre || '',
                            email: adm.email || '',
                            telefono: adm.telefono || '',
                            contacto: adm.contacto || '',
                          });
                        }}
                      >
                        <Edit3 size={16} color="#1F4FFF" />
                      </TouchableOpacity>
                      {administraciones.length > 1 && (
                        <TouchableOpacity
                          style={{ padding: 8 }}
                          onPress={() => deleteAdministracion(adm.id)}
                        >
                          <Trash2 size={16} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <View style={styles.modalActions}>
                <Button mode="contained" buttonColor="#0f172a" onPress={() => setAdminListModalVisible(false)}>
                  Cerrar
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>

      {/* MODAL 3: CONFIGURACIÓN DE SUPABASE Y CONEXIÓN */}
      <Modal visible={supaModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalCard} elevation={5}>
            <ScrollView>
              <Title style={styles.modalTitle}>Conexión Supabase & Modo Offline</Title>
              <Text style={styles.modalSub}>
                Configura las credenciales del proyecto Supabase o mantén el modo Offline-First local.
              </Text>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                    Modo Local / Demo (Offline-First)
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    Guarda cambios e importaciones localmente sin requerir servidor activo
                  </Text>
                </View>
                <Switch
                  value={supaForm.isDemoMode}
                  onValueChange={v => setSupaForm(prev => ({ ...prev, isDemoMode: v }))}
                  color="#1F4FFF"
                />
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <PaperInput
                label="Supabase Project URL"
                mode="outlined"
                value={supaForm.url}
                onChangeText={t => setSupaForm(prev => ({ ...prev, url: t }))}
                style={styles.input}
              />
              <PaperInput
                label="Supabase Anon Public Key"
                mode="outlined"
                value={supaForm.anonKey}
                onChangeText={t => setSupaForm(prev => ({ ...prev, anonKey: t }))}
                style={styles.input}
              />

              <Button
                mode="outlined"
                loading={testingConn}
                onPress={handleTestSupabase}
                style={{ marginBottom: 12 }}
              >
                Probar Conexión con el Servidor
              </Button>

              {connStatus && (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: connStatus.startsWith('Conectado') ? '#dcfce7' : '#fee2e2',
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: connStatus.startsWith('Conectado') ? '#16A344' : '#DC2626',
                    }}
                  >
                    {connStatus}
                  </Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button onPress={() => setSupaModalVisible(false)}>Cancelar</Button>
                <Button mode="contained" buttonColor="#1F4FFF" onPress={handleSaveSupabaseConfig}>
                  Guardar Configuración
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
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1F4FFF',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '800',
  },
  footerSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
  },
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
  modalTitle: {
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  sigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
