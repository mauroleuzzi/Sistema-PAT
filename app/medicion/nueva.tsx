import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, Title, Button, Surface, ActivityIndicator } from 'react-native-paper';
import {
  MapPin,
  Globe,
  Activity,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useDemo } from '../../src/context/DemoContext';
import { useAuth } from '../../src/context/AuthContext';
import { PuntoMedicion } from '../../src/types';
import {
  ResultKeypad,
  PhotoEvidence,
  FieldState,
  CompletionBar,
} from '../../src/components/FieldComponents';
import { calculateNextExpiration } from '../../src/services/importValidator';
import {
  formatDate,
  formatResistance,
  generateUUID,
  parseFlexibleDateToIso,
  toLocalIsoDate,
} from '../../src/lib/utils';

const { height } = Dimensions.get('window');

const LOCACION_PRESETS = [
  'Tablero Principal Planta Baja',
  'Sala de Medidores Subsuelo',
  'Caja de Inspección en Patio / Jardín',
  'Sala de Máquinas / Bombas',
];

const OBS_PRESETS = [
  'Instalación de puesta a tierra en buen estado general. Continuidad verificada. Cumple Res. SRT 900/15.',
  'Bornera y conductor de protección en correcto estado. Valor dentro de parámetros admisibles.',
  'Valor elevado de resistencia. Se recomienda acondicionamiento de jabalina y revisión de sulfatación en morseto.',
];

const SUELO_OPTIONS = [
  { label: 'Húmedo', value: 'lecho_humedo' },
  { label: 'Seco', value: 'lecho_seco' },
  { label: 'Muy Húmedo', value: 'muy_humedo' },
  { label: 'Otros', value: 'otros' },
];

const TIERRA_NO_VISIBLE_PRESETS = [
  'Bajo solado o contrapiso sin cámara accesible',
  'Bajo baldosa / solado fijo',
  'En sector inaccesible / unidad privada',
  'Sin cámara registrable visible',
];

export default function NuevaMedicion() {
  const { id, medicionId } = useLocalSearchParams<{ id?: string; medicionId?: string }>();
  const router = useRouter();
  const { consorcios, administraciones, mediciones, addMedicion, updateMedicion, updateConsorcio } =
    useDemo();
  const { user } = useAuth();

  const existingMedicion = medicionId ? mediciones.find(m => m.id === medicionId) : undefined;
  const consorcio =
    consorcios.find(c => c.id === (existingMedicion?.consorcio_id || id)) || consorcios[0];
  const adminObj = administraciones.find(a => a.id === consorcio?.administracion_id);

  // Medición histórica real más reciente (excluyendo la actual si estamos editando)
  const historical = mediciones
    .filter(m => m.consorcio_id === consorcio?.id && m.id !== existingMedicion?.id)
    .sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0];

  const hasHistorical = Boolean(historical);
  const historicalDateLabel = historical ? formatDate(historical.fecha_medicion) : '';
  const historicalVal = historical ? `${formatResistance(historical.resultado)} Ω (${historicalDateLabel})` : 'Sin mediciones previas';

  const todayIso = toLocalIsoDate(new Date());
  const yesterdayIso = toLocalIsoDate(new Date(Date.now() - 86400 * 1000));

  const initialLocacion =
    existingMedicion?.locacion ??
    historical?.locacion ??
    consorcio?.locacion_medicion_default ??
    '';
  const initialSuelo = existingMedicion?.condicion_suelo ?? historical?.condicion_suelo ?? 'lecho_humedo';
  const isCustomSuelo =
    initialSuelo && !['lecho_humedo', 'lecho_seco', 'muy_humedo', 'otros'].includes(initialSuelo);
  const initialObs =
    existingMedicion?.observaciones ??
    historical?.observaciones ??
    consorcio?.observaciones_base ??
    'Instalación de puesta a tierra en buen estado general. Continuidad verificada. Cumple Res. SRT 900/15.';

  const [formData, setFormData] = useState({
    fecha_medicion: existingMedicion?.fecha_medicion || todayIso,
    locacion: initialLocacion,
    resultado: existingMedicion?.resultado ? Number(existingMedicion.resultado).toFixed(2) : '',
    suelo: isCustomSuelo ? 'otros' : initialSuelo,
    suelo_otro: isCustomSuelo ? initialSuelo : '',
    observaciones: initialObs,
    tablero_photo: Boolean(existingMedicion?.foto_tablero_url),
    tierra_photo: Boolean(existingMedicion?.foto_tierra_url),
    tablero_photo_uri: existingMedicion?.foto_tablero_url || '',
    tierra_photo_uri: existingMedicion?.foto_tierra_url || '',
    tierra_no_visible: Boolean(existingMedicion?.tierra_no_visible),
    tierra_motivo_no_visible: existingMedicion?.tierra_motivo_no_visible || 'Bajo solado o contrapiso sin cámara accesible',
    encomienda_mode: (existingMedicion?.encomienda_mode || 'con_encomienda') as 'con_encomienda' | 'sin_encomienda',
    puntos_medicion: (existingMedicion?.puntos_medicion || []) as PuntoMedicion[],
    is_inherited: {
      locacion: !existingMedicion && hasHistorical && Boolean(historical?.locacion),
      suelo: !existingMedicion && hasHistorical && Boolean(historical?.condicion_suelo),
      observaciones: !existingMedicion && hasHistorical && Boolean(historical?.observaciones),
    },
  });

  const [keypadModalVisible, setKeypadModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({
      fecha_medicion: existingMedicion?.fecha_medicion || todayIso,
      locacion: initialLocacion,
      resultado: existingMedicion?.resultado ? Number(existingMedicion.resultado).toFixed(2) : '',
      suelo: isCustomSuelo ? 'otros' : initialSuelo,
      suelo_otro: isCustomSuelo ? initialSuelo : '',
      observaciones: initialObs,
      tablero_photo: Boolean(existingMedicion?.foto_tablero_url),
      tierra_photo: Boolean(existingMedicion?.foto_tierra_url),
      tablero_photo_uri: existingMedicion?.foto_tablero_url || '',
      tierra_photo_uri: existingMedicion?.foto_tierra_url || '',
      tierra_no_visible: Boolean(existingMedicion?.tierra_no_visible),
      tierra_motivo_no_visible: existingMedicion?.tierra_motivo_no_visible || 'Bajo solado o contrapiso sin cámara accesible',
      encomienda_mode: (existingMedicion?.encomienda_mode || 'con_encomienda') as 'con_encomienda' | 'sin_encomienda',
      puntos_medicion: (existingMedicion?.puntos_medicion || []) as PuntoMedicion[],
      is_inherited: {
        locacion: !existingMedicion && hasHistorical && Boolean(historical?.locacion),
        suelo: !existingMedicion && hasHistorical && Boolean(historical?.condicion_suelo),
        observaciones: !existingMedicion && hasHistorical && Boolean(historical?.observaciones),
      },
    });
  }, [id, medicionId]);

  const pickAndCompressPhotoWeb = (mode: 'camera' | 'gallery'): Promise<string | null> => {
    return new Promise(resolve => {
      if (typeof document === 'undefined') {
        resolve(null);
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (mode === 'camera') {
        input.setAttribute('capture', 'environment');
      }
      input.style.display = 'none';
      document.body.appendChild(input);

      const cleanup = () => {
        if (input.parentNode) input.parentNode.removeChild(input);
      };

      input.onchange = () => {
        const file = input.files?.[0];
        cleanup();
        if (!file) {
          resolve(null);
          return;
        }
        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          try {
            const MAX_DIM = 1000;
            let w = img.naturalWidth || img.width || 800;
            let h = img.naturalHeight || img.height || 600;
            if (w > MAX_DIM || h > MAX_DIM) {
              if (w > h) {
                h = Math.round((h * MAX_DIM) / w);
                w = MAX_DIM;
              } else {
                w = Math.round((w * MAX_DIM) / h);
                h = MAX_DIM;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
              URL.revokeObjectURL(objectUrl);
              resolve(dataUrl);
              return;
            }
          } catch (err) {
            console.warn('Error comprimiendo imagen en canvas:', err);
          }
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        img.src = objectUrl;
      };

      input.click();
    });
  };

  const handleCapturePhoto = async (field: 'tablero' | 'tierra', mode: 'camera' | 'gallery') => {
    try {
      if (Platform.OS === 'web') {
        const dataUrl = await pickAndCompressPhotoWeb(mode);
        if (dataUrl) {
          if (field === 'tablero') {
            setFormData(prev => ({ ...prev, tablero_photo: true, tablero_photo_uri: dataUrl }));
          } else {
            setFormData(prev => ({ ...prev, tierra_photo: true, tierra_photo_uri: dataUrl }));
          }
        }
        return;
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              base64: true,
            });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        if (field === 'tablero') {
          setFormData(prev => ({ ...prev, tablero_photo: true, tablero_photo_uri: uri }));
        } else {
          setFormData(prev => ({ ...prev, tierra_photo: true, tierra_photo_uri: uri }));
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar la fotografía.');
    }
  };

  const getFieldState = (field: string): FieldState => {
    switch (field) {
      case 'locacion':
        if (!formData.locacion || !formData.locacion.trim()) return 'red';
        return formData.is_inherited.locacion ? 'amber' : 'green';
      case 'resultado': {
        const res = parseFloat(formData.resultado);
        return !isNaN(res) && res > 0 ? 'green' : 'red';
      }
      case 'suelo':
        if (formData.suelo === 'otros' && !formData.suelo_otro.trim()) return 'red';
        return formData.is_inherited.suelo ? 'amber' : 'green';
      case 'observaciones':
        if (!formData.observaciones || !formData.observaciones.trim()) return 'red';
        return formData.is_inherited.observaciones ? 'amber' : 'green';
      default:
        return 'red';
    }
  };

  const parsedResultado = parseFloat(formData.resultado);
  const hasValidResultado = !isNaN(parsedResultado) && parsedResultado > 0;

  const getNormativeStatus = () => {
    if (!hasValidResultado) return null;
    if (parsedResultado <= 10) {
      return {
        label: 'ÓPTIMO (≤ 10 Ω • Recomendación AEA 90364 / COPIME)',
        color: '#16A344',
        bg: '#dcfce7',
      };
    }
    if (parsedResultado <= 40) {
      return {
        label: 'ADMISIBLE (≤ 40 Ω con Diferencial ≤ 30 mA • SRT 900/15)',
        color: '#D97706',
        bg: '#fef3c7',
      };
    }
    return {
      label: 'VALOR ELEVADO (> 40 Ω • Requiere mejora de puesta a tierra)',
      color: '#DC2626',
      bg: '#fee2e2',
    };
  };

  const normativeStatus = getNormativeStatus();

  const tierraSatisfied = formData.tierra_photo || formData.tierra_no_visible;
  const totalSteps = 6;
  const completedCount =
    (getFieldState('locacion') !== 'red' ? 1 : 0) +
    (getFieldState('suelo') !== 'red' ? 1 : 0) +
    (getFieldState('resultado') === 'green' ? 1 : 0) +
    (getFieldState('observaciones') !== 'red' ? 1 : 0) +
    (formData.tablero_photo ? 1 : 0) +
    (tierraSatisfied ? 1 : 0);

  const progress = completedCount / totalSteps;
  const hasRedFields =
    ['locacion', 'suelo', 'resultado', 'observaciones'].some(f => getFieldState(f) === 'red') ||
    !formData.tablero_photo ||
    !tierraSatisfied;
  const canSave = !hasRedFields;

  const handleSave = () => {
    if (hasRedFields) {
      const missing: string[] = [];
      if (getFieldState('resultado') === 'red') missing.push('Valor de Resistencia (Ω)');
      if (getFieldState('locacion') === 'red') missing.push('Locación de la medición');
      if (getFieldState('suelo') === 'red') missing.push('Condición del suelo');
      if (getFieldState('observaciones') === 'red') missing.push('Observaciones técnicas');
      if (!formData.tablero_photo) missing.push('Foto Tablero Seccional (Obligatoria)');
      if (!tierraSatisfied) missing.push('Foto Jabalina o activar "Jabalina no visible / bajo solado"');

      if (Platform.OS === 'web') {
        window.alert(`Faltan completar los siguientes datos:\n\n• ${missing.join('\n• ')}`);
      } else {
        Alert.alert(
          'FALTAN DATOS OBLIGATORIOS',
          `Completá los siguientes puntos antes de guardar:\n• ${missing.join('\n• ')}`
        );
      }
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const cleanDate = parseFlexibleDateToIso(formData.fecha_medicion, todayIso);

      const finalSuelo = formData.suelo === 'otros' ? formData.suelo_otro.trim() : formData.suelo;

      if (existingMedicion) {
        updateMedicion(existingMedicion.id, {
          fecha_medicion: cleanDate,
          resultado: parseFloat(formData.resultado),
          condicion_suelo: finalSuelo,
          locacion: formData.locacion.trim(),
          observaciones: formData.observaciones.trim(),
          foto_tablero_url: formData.tablero_photo_uri || undefined,
          foto_tierra_url: formData.tierra_no_visible ? undefined : formData.tierra_photo_uri || undefined,
          tierra_no_visible: formData.tierra_no_visible,
          tierra_motivo_no_visible: formData.tierra_no_visible ? formData.tierra_motivo_no_visible : undefined,
          puntos_medicion: formData.puntos_medicion.length > 0 ? formData.puntos_medicion : undefined,
          encomienda_mode: formData.encomienda_mode,
        });
      } else {
        const newMed = {
          id: generateUUID(),
          consorcio_id: consorcio.id,
          usuario_id: user?.id || '11111111-1111-1111-1111-111111111111',
          fecha_medicion: cleanDate,
          estado: 'pendiente_aprobacion' as const,
          resultado: parseFloat(formData.resultado),
          condicion_suelo: finalSuelo,
          locacion: formData.locacion.trim(),
          observaciones: formData.observaciones.trim(),
          heredado_locacion: formData.is_inherited.locacion,
          heredado_condicion: formData.is_inherited.suelo,
          heredado_observaciones: formData.is_inherited.observaciones,
          foto_tablero_url: formData.tablero_photo_uri || undefined,
          foto_tierra_url: formData.tierra_no_visible ? undefined : formData.tierra_photo_uri || undefined,
          tierra_no_visible: formData.tierra_no_visible,
          tierra_motivo_no_visible: formData.tierra_no_visible ? formData.tierra_motivo_no_visible : undefined,
          puntos_medicion: formData.puntos_medicion.length > 0 ? formData.puntos_medicion : undefined,
          encomienda_mode: formData.encomienda_mode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addMedicion(newMed);
      }

      const nextExp = calculateNextExpiration(cleanDate);
      if (nextExp) {
        updateConsorcio(consorcio.id, {
          vencimiento_proximo: nextExp,
          locacion_medicion_default: formData.locacion.trim(),
        });
      }

      setLoading(false);
      router.replace('/(tabs)/medicion');
    }, 300);
  };

  const renderSectionBadge = (state: FieldState) => {
    const cfg =
      state === 'green'
        ? { text: 'LISTO', color: '#16A344', bg: '#dcfce7' }
        : state === 'amber'
        ? { text: 'HEREDADO', color: '#B45309', bg: '#fef3c7' }
        : { text: 'FALTANTE', color: '#DC2626', bg: '#fee2e2' };
    return (
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.text}</Text>
      </View>
    );
  };

  const hasAnyInherited =
    formData.is_inherited.locacion ||
    formData.is_inherited.suelo ||
    formData.is_inherited.observaciones;

  const histRes = historical?.resultado ? Number(historical.resultado) : null;
  const currentRes = hasValidResultado ? parsedResultado : null;
  let compDiffPct: number | null = null;
  if (histRes && currentRes && histRes > 0) {
    compDiffPct = ((currentRes - histRes) / histRes) * 100;
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.topHeader} elevation={1}>
        <View style={styles.badgeRow}>
          <View style={styles.activeBadge}>
            <CheckCircle2 size={12} color="#16A344" />
            <Text style={styles.activeBadgeText}>
              {existingMedicion ? 'EDITANDO MEDICIÓN' : 'MEDICIÓN EN CAMPO'}
            </Text>
          </View>
          {hasHistorical && (
            <View style={[styles.activeBadge, { backgroundColor: '#1e293b' }]}>
              <Text style={[styles.activeBadgeText, { color: '#93c5fd' }]}>
                Anterior: {historicalVal}
              </Text>
            </View>
          )}
        </View>
        <Title style={styles.headerTitle}>{consorcio?.direccion}</Title>
        <Text style={styles.headerSubtitle}>
          {consorcio?.solicitante} • {adminObj?.nombre || 'Administración Particular'}
        </Text>
      </Surface>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <CompletionBar progress={progress} total={totalSteps} current={completedCount} />

        {hasAnyInherited && (
          <TouchableOpacity
            style={[
              styles.confirmInheritedBtn,
              { marginTop: 0, marginBottom: 14, paddingHorizontal: 14 },
            ]}
            onPress={() =>
              setFormData(prev => ({
                ...prev,
                is_inherited: { locacion: false, suelo: false, observaciones: false },
              }))
            }
          >
            <Check size={16} color="#fff" />
            <Text style={styles.confirmInheritedText}>
              Confirmar todos los datos heredados ({historicalDateLabel})
            </Text>
          </TouchableOpacity>
        )}

        {/* 1. RESULTADO OBTENIDO (Ω) - PRIMERO PORQUE ES EL DATO CENTRAL DEL INSTRUMENTO */}
        <Surface
          style={[
            styles.sectionCard,
            {
              borderColor: getFieldState('resultado') === 'green' ? '#16A344' : '#DC2626',
              borderWidth: 2.5,
            },
          ]}
          elevation={2}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Activity size={20} color="#1F4FFF" />
              <Text style={styles.sectionTitle}>1. VALOR DE RESISTENCIA MEDIDO (Ω)</Text>
            </View>
            {renderSectionBadge(getFieldState('resultado'))}
          </View>

          <TouchableOpacity
            style={styles.ohmDisplayButton}
            onPress={() => setKeypadModalVisible(true)}
            activeOpacity={0.75}
          >
            <View>
              <Text style={styles.ohmDisplayLabel}>
                {hasValidResultado ? 'VALOR A IMPRIMIR EN PROTOCOLO' : 'TOCÁ PARA INGRESAR VALOR'}
              </Text>
              <Text
                style={[
                  styles.ohmDisplayBig,
                  !hasValidResultado && { color: '#94a3b8' },
                ]}
              >
                {hasValidResultado ? `${formatResistance(formData.resultado)} Ω` : '0,00 Ω'}
              </Text>
            </View>
            <View style={styles.editOhmPill}>
              <Text style={styles.editOhmPillText}>
                {hasValidResultado ? 'CAMBIAR' : 'CARGAR Ω'}
              </Text>
            </View>
          </TouchableOpacity>

          {normativeStatus && (
            <View style={[styles.normativeBanner, { backgroundColor: normativeStatus.bg }]}>
              <Text style={[styles.normativeText, { color: normativeStatus.color }]}>
                {normativeStatus.label}
              </Text>
            </View>
          )}

          {/* MEJORA 1: COMPARATIVA EN VIVO VS AÑO ANTERIOR */}
          {compDiffPct !== null && histRes !== null && (
            <View
              style={[
                styles.comparativeCard,
                compDiffPct > 50 || (currentRes && currentRes > 40)
                  ? styles.compAlertBg
                  : compDiffPct < -20
                  ? styles.compSuccessBg
                  : styles.compNeutralBg,
              ]}
            >
              <View style={styles.compHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {compDiffPct > 50 || (currentRes && currentRes > 40) ? (
                    <AlertTriangle size={16} color="#DC2626" />
                  ) : (
                    <Activity size={16} color={compDiffPct < -20 ? '#16A344' : '#1F4FFF'} />
                  )}
                  <Text
                    style={[
                      styles.compTitle,
                      {
                        color:
                          compDiffPct > 50 || (currentRes && currentRes > 40)
                            ? '#DC2626'
                            : compDiffPct < -20
                            ? '#16A344'
                            : '#0f172a',
                      },
                    ]}
                  >
                    {compDiffPct > 50
                      ? 'ALERTA: AUMENTO SIGNIFICATIVO'
                      : compDiffPct > 20
                      ? 'VARIACIÓN EN ALZA DETECTADA'
                      : compDiffPct < -20
                      ? 'MEJORA RESPECTO AL AÑO ANTERIOR'
                      : 'VALOR ESTABLE RESPECTO AL HISTÓRICO'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.compDiffBadge,
                    {
                      backgroundColor:
                        compDiffPct > 50
                          ? '#fee2e2'
                          : compDiffPct < -20
                          ? '#dcfce7'
                          : '#f1f5f9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.compDiffText,
                      {
                        color:
                          compDiffPct > 50
                            ? '#DC2626'
                            : compDiffPct < -20
                            ? '#16A344'
                            : '#475569',
                      },
                    ]}
                  >
                    {compDiffPct >= 0 ? `+${compDiffPct.toFixed(1)}%` : `${compDiffPct.toFixed(1)}%`}
                  </Text>
                </View>
              </View>
              <Text style={styles.compDesc}>
                Anterior: <Text style={{ fontWeight: '800' }}>{formatResistance(histRes)} Ω</Text> ({historicalDateLabel}) → Actual: <Text style={{ fontWeight: '800' }}>{formatResistance(currentRes)} Ω</Text>
                {compDiffPct > 50
                  ? '\n⚠️ Posible sulfatación de terminales, borne flojo o desecamiento de jabalina. Verifique antes de cerrar.'
                  : ''}
              </Text>
            </View>
          )}
        </Surface>

        {/* MEJORA 2: MÚLTIPLES JABALINAS / PUNTOS DE MEDICIÓN ADICIONALES */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Activity size={18} color="#475569" />
              <Text style={styles.sectionTitle}>
                PUNTOS DE MEDICIÓN / JABALINAS ({formData.puntos_medicion.length > 0 ? formData.puntos_medicion.length : '1 PRINCIPAL'})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addPuntoBtn}
              onPress={() => {
                const nextIdx = formData.puntos_medicion.length + 1;
                setFormData(prev => ({
                  ...prev,
                  puntos_medicion: [
                    ...prev.puntos_medicion,
                    {
                      id: generateUUID(),
                      etiqueta: `Jabalina ${nextIdx}`,
                      valor: hasValidResultado ? parsedResultado : 0,
                      locacion: 'Sala de Máquinas / Subsuelo',
                    },
                  ],
                }));
              }}
            >
              <Plus size={14} color="#1F4FFF" />
              <Text style={styles.addPuntoBtnText}>+ Agregar Jabalina</Text>
            </TouchableOpacity>
          </View>

          {formData.puntos_medicion.length === 0 ? (
            <Text style={styles.emptyPuntosText}>
              Consorcio con 1 sola toma de tierra principal (estándar). Si el edificio tiene electrodos adicionales (ej: Ascensores, Bombas o Servicios Generales), podés agregarlos arriba para que figuren en el protocolo.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {formData.puntos_medicion.map((punto, idx) => (
                <View key={punto.id} style={styles.puntoRowCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <RNTextInput
                        style={styles.puntoInputTag}
                        value={punto.etiqueta}
                        onChangeText={t => {
                          setFormData(prev => ({
                            ...prev,
                            puntos_medicion: prev.puntos_medicion.map((p, i) =>
                              i === idx ? { ...p, etiqueta: t } : p
                            ),
                          }));
                        }}
                        placeholder="Ej: Jabalina 2 (Ascensores)"
                        placeholderTextColor="#94a3b8"
                      />
                      <RNTextInput
                        style={styles.puntoInputVal}
                        keyboardType="numeric"
                        value={String(punto.valor || '')}
                        onChangeText={t => {
                          const valNum = parseFloat(t) || 0;
                          setFormData(prev => ({
                            ...prev,
                            puntos_medicion: prev.puntos_medicion.map((p, i) =>
                              i === idx ? { ...p, valor: valNum } : p
                            ),
                          }));
                        }}
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                      />
                      <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 13 }}>Ω</Text>
                    </View>
                    <RNTextInput
                      style={styles.puntoInputLoc}
                      value={punto.locacion || ''}
                      onChangeText={t => {
                        setFormData(prev => ({
                          ...prev,
                          puntos_medicion: prev.puntos_medicion.map((p, i) =>
                            i === idx ? { ...p, locacion: t } : p
                          ),
                        }));
                      }}
                      placeholder="Ubicación (ej: Sala de Máquinas)"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.puntoDeleteBtn}
                    onPress={() => {
                      setFormData(prev => ({
                        ...prev,
                        puntos_medicion: prev.puntos_medicion.filter((_, i) => i !== idx),
                      }));
                    }}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Surface>

        {/* 2. FECHA DE LA MEDICIÓN */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Calendar size={18} color="#475569" />
              <Text style={styles.sectionTitle}>2. FECHA DE LA MEDICIÓN</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F4FFF' }}>
              {formatDate(formData.fecha_medicion)}
            </Text>
          </View>
          <View style={styles.inlineChipsRow}>
            <TouchableOpacity
              style={[
                styles.miniChip,
                formData.fecha_medicion === todayIso && styles.miniChipActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, fecha_medicion: todayIso }))}
            >
              <Text
                style={[
                  styles.miniChipText,
                  formData.fecha_medicion === todayIso && styles.miniChipTextActive,
                ]}
              >
                Hoy ({formatDate(todayIso)})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.miniChip,
                formData.fecha_medicion === yesterdayIso && styles.miniChipActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, fecha_medicion: yesterdayIso }))}
            >
              <Text
                style={[
                  styles.miniChipText,
                  formData.fecha_medicion === yesterdayIso && styles.miniChipTextActive,
                ]}
              >
                Ayer ({formatDate(yesterdayIso)})
              </Text>
            </TouchableOpacity>
            <RNTextInput
              style={styles.dateInputInline}
              value={formData.fecha_medicion}
              onChangeText={t => setFormData(prev => ({ ...prev, fecha_medicion: t }))}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </Surface>

        {/* 3. LOCACIÓN DE LA MEDICIÓN (EDICIÓN DIRECTA + CHIPS RÁPIDOS) */}
        <Surface
          style={[
            styles.sectionCard,
            {
              borderColor:
                getFieldState('locacion') === 'green'
                  ? '#16A344'
                  : getFieldState('locacion') === 'amber'
                  ? '#F59E0B'
                  : '#DC2626',
              borderWidth: 2,
            },
          ]}
          elevation={1}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <MapPin size={18} color="#475569" />
              <Text style={styles.sectionTitle}>3. LOCACIÓN DE LA TOMA DE TIERRA</Text>
            </View>
            {renderSectionBadge(getFieldState('locacion'))}
          </View>

          <RNTextInput
            style={styles.inlineTextInput}
            value={formData.locacion}
            onChangeText={t =>
              setFormData(prev => ({
                ...prev,
                locacion: t,
                is_inherited: { ...prev.is_inherited, locacion: false },
              }))
            }
            placeholder="Ej: Tablero Principal Planta Baja..."
            placeholderTextColor="#94a3b8"
          />

          <View style={styles.inlineChipsRow}>
            {LOCACION_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.miniChip,
                  formData.locacion === preset && styles.miniChipActive,
                ]}
                onPress={() =>
                  setFormData(prev => ({
                    ...prev,
                    locacion: preset,
                    is_inherited: { ...prev.is_inherited, locacion: false },
                  }))
                }
              >
                <Text
                  style={[
                    styles.miniChipText,
                    formData.locacion === preset && styles.miniChipTextActive,
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.is_inherited.locacion && (
            <TouchableOpacity
              style={styles.confirmInheritedBtn}
              onPress={() =>
                setFormData(prev => ({
                  ...prev,
                  is_inherited: { ...prev.is_inherited, locacion: false },
                }))
              }
            >
              <Check size={16} color="#fff" />
              <Text style={styles.confirmInheritedText}>
                Confirmar locación heredada ({historicalDateLabel})
              </Text>
            </TouchableOpacity>
          )}
        </Surface>

        {/* 4. CONDICIÓN DEL SUELO (1 SOLO TOQUE EN PANTALLA SIN MODAL) */}
        <Surface
          style={[
            styles.sectionCard,
            {
              borderColor:
                getFieldState('suelo') === 'green'
                  ? '#16A344'
                  : getFieldState('suelo') === 'amber'
                  ? '#F59E0B'
                  : '#DC2626',
              borderWidth: 2,
            },
          ]}
          elevation={1}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Globe size={18} color="#475569" />
              <Text style={styles.sectionTitle}>4. CONDICIÓN DEL SUELO</Text>
            </View>
            {renderSectionBadge(getFieldState('suelo'))}
          </View>

          <View style={styles.inlineChipsRow}>
            {SUELO_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.soilBtn,
                  formData.suelo === opt.value && styles.soilBtnActive,
                ]}
                onPress={() =>
                  setFormData(prev => ({
                    ...prev,
                    suelo: opt.value,
                    is_inherited: { ...prev.is_inherited, suelo: false },
                  }))
                }
              >
                <Text
                  style={[
                    styles.soilBtnText,
                    formData.suelo === opt.value && styles.soilBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.suelo === 'otros' && (
            <RNTextInput
              style={[styles.inlineTextInput, { marginTop: 10 }]}
              value={formData.suelo_otro}
              onChangeText={t => setFormData(prev => ({ ...prev, suelo_otro: t }))}
              placeholder="Especificar condición del suelo..."
              placeholderTextColor="#94a3b8"
            />
          )}
        </Surface>

        {/* 5. OBSERVACIONES TÉCNICAS (EDICIÓN DIRECTA + PLANTILLAS NORMATIVAS) */}
        <Surface
          style={[
            styles.sectionCard,
            {
              borderColor:
                getFieldState('observaciones') === 'green'
                  ? '#16A344'
                  : getFieldState('observaciones') === 'amber'
                  ? '#F59E0B'
                  : '#DC2626',
              borderWidth: 2,
            },
          ]}
          elevation={1}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <FileText size={18} color="#475569" />
              <Text style={styles.sectionTitle}>5. OBSERVACIONES TÉCNICAS</Text>
            </View>
            {renderSectionBadge(getFieldState('observaciones'))}
          </View>

          <RNTextInput
            style={[styles.inlineTextInput, { minHeight: 72, textAlignVertical: 'top' }]}
            multiline
            value={formData.observaciones}
            onChangeText={t =>
              setFormData(prev => ({
                ...prev,
                observaciones: t,
                is_inherited: { ...prev.is_inherited, observaciones: false },
              }))
            }
            placeholder="Observaciones del estado de jabalina, morseto y continuidad..."
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.presetSectionLabel}>PLANTILLAS RÁPIDAS (1 TOQUE):</Text>
          <View style={{ gap: 6 }}>
            {OBS_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.obsPresetBtn,
                  formData.observaciones === preset && styles.obsPresetBtnActive,
                ]}
                onPress={() =>
                  setFormData(prev => ({
                    ...prev,
                    observaciones: preset,
                    is_inherited: { ...prev.is_inherited, observaciones: false },
                  }))
                }
              >
                <Text
                  style={[
                    styles.obsPresetText,
                    formData.observaciones === preset && { color: '#1F4FFF', fontWeight: '800' },
                  ]}
                  numberOfLines={2}
                >
                  • {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Surface>

        {/* TIPO DE PROTOCOLO SOLICITADO / SALIDA DUAL */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <FileText size={18} color="#475569" />
              <Text style={styles.sectionTitle}>TIPO DE DOCUMENTO A EMITIR</Text>
            </View>
          </View>
          <View style={styles.dualOutputRow}>
            <TouchableOpacity
              style={[
                styles.dualOption,
                formData.encomienda_mode === 'con_encomienda' && styles.dualOptionActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, encomienda_mode: 'con_encomienda' }))}
            >
              <Text
                style={[
                  styles.dualOptionTitle,
                  formData.encomienda_mode === 'con_encomienda' && styles.dualOptionTitleActive,
                ]}
              >
                📜 Con Encomienda COPIME
              </Text>
              <Text style={styles.dualOptionSub}>Protocolo Oficial con timbrado colegial reglamentario.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dualOption,
                formData.encomienda_mode === 'sin_encomienda' && styles.dualOptionActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, encomienda_mode: 'sin_encomienda' }))}
            >
              <Text
                style={[
                  styles.dualOptionTitle,
                  formData.encomienda_mode === 'sin_encomienda' && styles.dualOptionTitleActive,
                ]}
              >
                📋 Certificado Técnico (Sin Encomienda)
              </Text>
              <Text style={styles.dualOptionSub}>Relevamiento y verificación anual sin arancel COPIME.</Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* 6. EVIDENCIA FOTOGRÁFICA */}
        <PhotoEvidence
          label="6A. Foto Tablero Seccional (Obligatoria)"
          captured={formData.tablero_photo}
          photoUri={formData.tablero_photo_uri}
          onTake={() => handleCapturePhoto('tablero', 'camera')}
          onUpload={() => handleCapturePhoto('tablero', 'gallery')}
        />

        {/* 6B. Foto Registro Puesta a Tierra (Jabalina) con Opción No Visible */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>6B. FOTO JABALINA / REGISTRO P.A.T.</Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: formData.tierra_photo
                    ? '#dcfce7'
                    : formData.tierra_no_visible
                    ? '#fef3c7'
                    : '#fee2e2',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: formData.tierra_photo
                      ? '#16A344'
                      : formData.tierra_no_visible
                      ? '#B45309'
                      : '#DC2626',
                  },
                ]}
              >
                {formData.tierra_photo
                  ? 'FOTO CARGADA'
                  : formData.tierra_no_visible
                  ? 'NO VISIBLE'
                  : 'FALTANTE'}
              </Text>
            </View>
          </View>

          {/* Toggle para indicar si no es visible */}
          <TouchableOpacity
            style={[
              styles.noVisibleToggle,
              formData.tierra_no_visible && styles.noVisibleToggleActive,
            ]}
            onPress={() =>
              setFormData(prev => ({
                ...prev,
                tierra_no_visible: !prev.tierra_no_visible,
              }))
            }
          >
            <View
              style={[
                styles.checkSquare,
                formData.tierra_no_visible && styles.checkSquareActive,
              ]}
            >
              {formData.tierra_no_visible && <Check size={14} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noVisibleToggleTitle}>
                Jabalina no visible / bajo solado (sin cámara)
              </Text>
              <Text style={styles.noVisibleToggleSub}>
                Tildá si el electrodo está embutido bajo baldosa/contrapiso y no es posible fotografiarlo.
              </Text>
            </View>
          </TouchableOpacity>

          {formData.tierra_no_visible ? (
            <View style={styles.noVisibleDetailsBox}>
              <Text style={styles.noVisibleDetailsLabel}>MOTIVO TÉCNICO DE NO VISIBILIDAD:</Text>
              <RNTextInput
                style={styles.noVisibleInput}
                value={formData.tierra_motivo_no_visible}
                onChangeText={t => setFormData(prev => ({ ...prev, tierra_motivo_no_visible: t }))}
                placeholder="Indique motivo o elija una opción rápida..."
                placeholderTextColor="#94a3b8"
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {TIERRA_NO_VISIBLE_PRESETS.map((motivo, mi) => (
                  <TouchableOpacity
                    key={mi}
                    style={[
                      styles.motivoPill,
                      formData.tierra_motivo_no_visible === motivo && styles.motivoPillActive,
                    ]}
                    onPress={() =>
                      setFormData(prev => ({ ...prev, tierra_motivo_no_visible: motivo }))
                    }
                  >
                    <Text
                      style={[
                        styles.motivoPillText,
                        formData.tierra_motivo_no_visible === motivo && styles.motivoPillTextActive,
                      ]}
                    >
                      {motivo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <PhotoEvidence
              label="Foto Registro Puesta a Tierra (Jabalina)"
              captured={formData.tierra_photo}
              photoUri={formData.tierra_photo_uri}
              onTake={() => handleCapturePhoto('tierra', 'camera')}
              onUpload={() => handleCapturePhoto('tierra', 'gallery')}
            />
          )}
        </Surface>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* FOOTER FIJO */}
      <Surface style={styles.footer} elevation={5}>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            canSave ? styles.bgGreen : styles.bgNeutral,
            loading && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveBtnText}>
                {existingMedicion?.estado === 'aprobado'
                  ? 'GUARDAR CAMBIOS (APROBADO)'
                  : canSave
                  ? 'GUARDAR INFORME (ENVIAR A REVISIÓN)'
                  : `COMPLETAR DATOS (${completedCount}/${totalSteps})`}
              </Text>
              {canSave && <CheckCircle2 size={22} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </Surface>

      {/* MODAL EXCLUSIVO PARA EL TECLADO NUMÉRICO PROGRESIVO DE RESISTENCIA (Ω) */}
      <Modal visible={keypadModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>VALOR DE RESISTENCIA (Ω)</Title>
              <TouchableOpacity onPress={() => setKeypadModalVisible(false)}>
                <ArrowLeft size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ResultKeypad
                value={formData.resultado}
                onChange={(t: string) => setFormData(prev => ({ ...prev, resultado: t }))}
                lastResult={historicalVal}
              />
            </View>
            <Button
              mode="contained"
              onPress={() => setKeypadModalVisible(false)}
              style={styles.confirmBtn}
              labelStyle={styles.confirmLabel}
            >
              CONFIRMAR VALOR ({formatResistance(formData.resultado)} Ω)
            </Button>
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
  topHeader: {
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 18,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A344',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  ohmDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ohmDisplayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  ohmDisplayBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
  },
  editOhmPill: {
    backgroundColor: '#1F4FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  editOhmPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  normativeBanner: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  normativeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inlineTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  inlineChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  miniChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  miniChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1F4FFF',
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  miniChipTextActive: {
    color: '#1F4FFF',
    fontWeight: '900',
  },
  dateInputInline: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 115,
  },
  confirmInheritedBtn: {
    marginTop: 10,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmInheritedText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  soilBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  soilBtnActive: {
    backgroundColor: '#1F4FFF',
    borderColor: '#1F4FFF',
  },
  soilBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  soilBtnTextActive: {
    color: '#fff',
  },
  presetSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  obsPresetBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  obsPresetBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#1F4FFF',
  },
  obsPresetText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#0f172a',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  saveBtn: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  bgGreen: { backgroundColor: '#1F4FFF' },
  bgNeutral: { backgroundColor: '#334155' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalBody: {},
  confirmBtn: {
    marginTop: 14,
    height: 52,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1F4FFF',
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  // MEJORA 1: COMPARATIVA
  comparativeCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  compAlertBg: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  compSuccessBg: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  compNeutralBg: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  compDiffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compDiffText: {
    fontSize: 11,
    fontWeight: '900',
  },
  compDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  // MEJORA 2: PUNTOS ADICIONALES
  addPuntoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addPuntoBtnText: {
    color: '#1F4FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPuntosText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  puntoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    borderRadius: 10,
  },
  puntoInputTag: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  puntoInputVal: {
    width: 65,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  puntoInputLoc: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: '#475569',
  },
  puntoDeleteBtn: {
    padding: 8,
  },
  // SALIDA DUAL
  dualOutputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dualOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  dualOptionActive: {
    borderColor: '#1F4FFF',
    backgroundColor: '#eff6ff',
  },
  dualOptionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  dualOptionTitleActive: {
    color: '#1F4FFF',
  },
  dualOptionSub: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  // JABALINA NO VISIBLE
  noVisibleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  noVisibleToggleActive: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSquareActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  noVisibleToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  noVisibleToggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  noVisibleDetailsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  noVisibleDetailsLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noVisibleInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  motivoPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  motivoPillActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  motivoPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  motivoPillTextActive: {
    color: '#b45309',
    fontWeight: '800',
  },
});
