import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Image } from 'react-native';
import { Surface, TextInput, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { AlertTriangle, CheckCircle2, ChevronRight, AlertCircle, Camera, Image as ImageIcon, Upload, Info, Check, Delete } from 'lucide-react-native';
import { formatResistance, formatShiftRegisterDisplay } from '../lib/utils';

export type FieldState = 'red' | 'amber' | 'green';

interface ActionCardProps {
  title: string;
  subtitle?: string;
  history?: string;
  state: FieldState;
  onPress: () => void;
  onConfirm?: () => void;
  icon?: any;
}

export const ActionCard = ({ title, subtitle, history, state, onPress, onConfirm, icon: Icon }: ActionCardProps) => {
  const colors = {
    red: { border: '#DC2626', bg: '#fff', text: '#DC2626', badge: 'Faltante', badgeBg: '#fee2e2' },
    amber: { border: '#F59E0B', bg: '#fff', text: '#B45309', badge: 'Pendiente', badgeBg: '#fef3c7' },
    green: { border: '#16A344', bg: '#fff', text: '#16A344', badge: 'Completo', badgeBg: '#dcfce7' },
  };

  const current = colors[state];

  return (
    <Surface 
      style={[
        styles.card, 
        { borderColor: current.border, borderWidth: 3 }
      ]} 
      elevation={2}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {Icon && <Icon size={20} color="#475569" style={{marginRight: 10}} />}
          <Text style={styles.cardTitle}>{title.toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: current.badgeBg }]}>
          <Text style={[styles.badgeText, { color: current.text }]}>{current.badge.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardValue}>{subtitle || 'Sin información'}</Text>
        {history && <Text style={styles.cardHistory}>{history}</Text>}
      </View>

      <View style={styles.cardActions}>
        {state === 'amber' && onConfirm ? (
          <>
            <TouchableOpacity onPress={onConfirm} style={[styles.actionBtn, styles.btnPrimary]}>
              <Check size={20} color="#fff" strokeWidth={3} />
              <Text style={styles.btnPrimaryText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onPress} style={[styles.actionBtn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>O editar dato</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            onPress={onPress} 
            style={[
              styles.actionBtn, 
              state === 'red' ? styles.btnRed : styles.btnGhostFull
            ]}
          >
            <Text style={state === 'red' ? styles.btnPrimaryText : styles.btnGhostText}>
              {state === 'red' ? 'Completar ahora' : 'Editar información'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );
};

export const CompletionBar = ({ progress, total, current }: any) => (
  <View style={styles.progContainer}>
    <View style={styles.progHeader}>
       <Text style={styles.progTitle}>PROGRESO DE COMPLETITUD</Text>
       <Text style={styles.progCount}>{current} de {total} campos completados</Text>
    </View>
    <ProgressBar progress={progress} color="#1F4FFF" style={styles.progBar} />
  </View>
);

export const ResultKeypad = ({ value, onChange, lastResult }: any) => {
  const normalized = typeof value === 'string' ? value.replace(',', '.') : String(value || '');
  const parsed = parseFloat(normalized);
  const cents = !isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;

  const handleDigitPress = (digit: number) => {
    const nextCents = cents * 10 + digit;
    if (nextCents > 99999) return; // Máximo 999,99 Ω
    const nextVal = nextCents === 0 ? '' : (nextCents / 100).toFixed(2);
    onChange(nextVal);
  };

  const handleBackspace = () => {
    const nextCents = Math.floor(cents / 10);
    const nextVal = nextCents === 0 ? '' : (nextCents / 100).toFixed(2);
    onChange(nextVal);
  };

  const handleClear = () => {
    onChange('');
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(Number(e.key));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cents]);

  const shiftDisplay = formatShiftRegisterDisplay(value);
  const printedDisplay = formatResistance(value);

  return (
    <View style={styles.keypadContainer}>
      <View style={styles.keypadTopRow}>
        <Text style={styles.lastResultText}>Última medición: {lastResult || '--'}</Text>
        <Text style={styles.printedPreviewText}>
          Se imprime: <Text style={{ color: '#1F4FFF', fontWeight: '900' }}>{printedDisplay} Ω</Text>
        </Text>
      </View>

      <View style={styles.digitalDisplayBox}>
        <Text style={styles.digitalDisplayValue}>{shiftDisplay}</Text>
        <Text style={styles.digitalDisplayUnit}>Ω</Text>
      </View>

      <View style={styles.numpadGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <TouchableOpacity
            key={num}
            style={styles.numpadKey}
            activeOpacity={0.65}
            onPress={() => handleDigitPress(num)}
          >
            <Text style={styles.numpadKeyText}>{num}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.numpadKey, styles.numpadKeySecondary]}
          activeOpacity={0.65}
          onPress={handleClear}
        >
          <Text style={[styles.numpadKeyText, { fontSize: 16, color: '#64748b' }]}>00,00</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.numpadKey}
          activeOpacity={0.65}
          onPress={() => handleDigitPress(0)}
        >
          <Text style={styles.numpadKeyText}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.numpadKey, styles.numpadKeySecondary]}
          activeOpacity={0.65}
          onPress={handleBackspace}
        >
          <Delete size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const QuickSelect = ({ options, value, onSelect }: any) => (
  <View style={styles.chipsContainer}>
    {options.map((opt: any) => (
      <TouchableOpacity
        key={opt.value}
        onPress={() => onSelect(opt.value)}
        style={[
          styles.chip,
          value === opt.value && styles.chipActive
        ]}
      >
        <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const PhotoEvidence = ({ label, captured, photoUri, loading, onTake, onUpload }: any) => (
  <View style={[
    styles.photoContainer, 
    { borderColor: captured ? '#16A344' : '#DC2626', borderWidth: 3 }
  ]}>
    <View style={styles.photoHeader}>
       <View style={styles.titleRow}>
          <Camera size={20} color="#475569" style={{marginRight: 10}} />
          <Text style={styles.photoLabel}>{label.toUpperCase()}</Text>
       </View>
       <View style={[styles.badge, { backgroundColor: captured ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.badgeText, { color: captured ? '#16A344' : '#DC2626' }]}>
            {captured ? 'COMPLETO' : 'FALTANTE'}
          </Text>
       </View>
    </View>
    
    <View style={styles.photoContent}>
      {loading ? (
        <ActivityIndicator size="large" color="#1F4FFF" />
      ) : captured && photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: '100%', height: '100%', borderRadius: 12 }}
          resizeMode="contain"
        />
      ) : captured ? (
        <View style={styles.previewBox}>
          <CheckCircle2 size={56} color="#16A344" />
          <Text style={styles.previewText}>IMAGEN CARGADA</Text>
        </View>
      ) : (
        <View style={styles.previewBoxEmpty}>
          <Camera size={56} color="#94a3b8" />
          <Text style={styles.previewTextEmpty}>Se requiere registro fotográfico obligatorio</Text>
        </View>
      )}
    </View>

    <View style={styles.photoActions}>
      <TouchableOpacity onPress={onTake} style={[styles.miniActionBtn, {backgroundColor: '#1F4FFF'}]}>
        <Camera size={18} color="#fff" />
        <Text style={styles.miniActionBtnText}>Tomar foto</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onUpload} style={[styles.miniActionBtn, styles.borderOutline]}>
        <Upload size={18} color="#0f172a" />
        <Text style={[styles.miniActionBtnText, {color: '#0f172a'}]}>Galería</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardBody: {
    marginBottom: 24,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardHistory: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'column',
    gap: 10,
  },
  actionBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: '#1F4FFF',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  btnGhost: {
    backgroundColor: '#F1F5F9',
  },
  btnGhostText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 15,
  },
  btnGhostFull: {
    borderWidth: 2,
    borderColor: '#cad4e0',
  },
  btnRed: {
    backgroundColor: '#DC2626',
  },
  progContainer: {
    marginVertical: 24,
  },
  progHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.5,
  },
  progCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F4FFF',
  },
  progBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  keypadContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  keypadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lastResultText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  printedPreviewText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  digitalDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#1F4FFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 16,
  },
  digitalDisplayValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  digitalDisplayUnit: {
    fontSize: 30,
    fontWeight: '900',
    color: '#475569',
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  numpadKey: {
    width: '31.5%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadKeySecondary: {
    backgroundColor: '#e2e8f0',
  },
  numpadKeyText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#1F4FFF',
    borderColor: '#1F4FFF',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
  },
  chipTextActive: {
    color: '#fff',
  },
  photoContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
  },
  photoContent: {
    height: 160,
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  previewBox: {
    alignItems: 'center',
  },
  previewBoxEmpty: {
    alignItems: 'center',
  },
  previewText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A344',
    marginTop: 12,
  },
  previewTextEmpty: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  miniActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
  },
  miniActionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  borderOutline: {
    borderWidth: 1.5,
    borderColor: '#cad4e0',
    backgroundColor: '#fff',
  }
});
