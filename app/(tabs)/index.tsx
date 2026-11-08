import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Title, Surface } from 'react-native-paper';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Plus,
  Calendar,
  Bell,
  RefreshCw,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useDemo } from '../../src/context/DemoContext';
import { useAuth } from '../../src/context/AuthContext';
import { useSkin } from '../../src/context/ThemeContext';
import { getConsorcioStatus } from '../../src/lib/utils';

export default function Dashboard() {
  const { consorcios, mediciones, profesionalConfig, refreshFromSupabase } = useDemo();
  const { user, isAdmin } = useAuth();
  const { skin, setSkinModalVisible } = useSkin();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const measuredIds = new Set(mediciones.map(m => m.consorcio_id));
  const pendingConsorcios = consorcios.filter(c => !measuredIds.has(c.id));
  const nextPending = pendingConsorcios[0];

  const counts = {
    vencidos: consorcios.filter(
      c => getConsorcioStatus(c, measuredIds.has(c.id)).status === 'vencido'
    ).length,
    proximos: consorcios.filter(
      c => getConsorcioStatus(c, measuredIds.has(c.id)).status === 'proximo'
    ).length,
    certificados: mediciones.length,
    pendientes: pendingConsorcios.length,
    total: consorcios.length,
  };

  const handleQuickRefresh = async () => {
    setRefreshing(true);
    await refreshFromSupabase();
    setRefreshing(false);
    Alert.alert('Sincronizado', 'Los datos están actualizados con la nube.');
  };

  const ScoreCard = ({ title, status, value, icon: Icon, color, bg, onPress }: any) => (
    <Surface
      style={[
        styles.scoreCard,
        { backgroundColor: skin.cardBg, borderColor: skin.border },
      ]}
      elevation={1}
    >
      <TouchableOpacity onPress={onPress} style={styles.scoreInner}>
        <View style={[styles.scoreIconArea, { backgroundColor: bg }]}>
          <Icon size={24} color={color} />
        </View>
        <View style={styles.scoreData}>
          <Text style={[styles.scoreValue, { color: skin.textPrimary }]}>{value}</Text>
          <Text style={[styles.scoreTitle, { color: skin.textPrimary }]}>{title}</Text>
          <Text style={[styles.scoreStatus, { color: skin.textSecondary }]}>{status}</Text>
        </View>
      </TouchableOpacity>
    </Surface>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: skin.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.greeting, { color: skin.textPrimary }]}>
              Hola, {user?.nombre || profesionalConfig.nombre}
            </Text>
            <Text style={[styles.subGreeting, { color: skin.textSecondary }]}>
              {user?.email
                ? `${user.email} • Rol: ${isAdmin ? 'Administrador' : 'Técnico Operativo'}`
                : 'Este es tu resumen operativo de hoy.'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              testID="dashboard-skin-btn"
              style={[
                styles.skinQuickBadge,
                { backgroundColor: skin.surfaceAlt, borderColor: skin.border },
              ]}
              onPress={() => setSkinModalVisible(true)}
            >
              {skin.isDark ? (
                <Moon size={13} color={skin.primary} />
              ) : (
                <Sun size={13} color={skin.primary} />
              )}
              <Text style={[styles.skinQuickText, { color: skin.textPrimary }]}>
                {skin.shortLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: skin.surfaceAlt }]}
              onPress={handleQuickRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={18} color={refreshing ? skin.primary : skin.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: skin.surfaceAlt }]}
              onPress={() => router.push({ pathname: '/(tabs)/consorcio', params: { filter: 'vencidos' } })}
            >
              <Bell size={18} color={skin.textPrimary} />
              {counts.vencidos > 0 && <View style={styles.redDot} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.scoreGrid}>
        <ScoreCard
          title="Vencidos"
          status={
            counts.proximos > 0
              ? `Acción • ${counts.proximos} próx. (≤60d)`
              : 'Requieren acción'
          }
          value={counts.vencidos}
          icon={AlertCircle}
          color="#DC2626"
          bg={skin.isDark ? '#450a0a' : '#fee2e2'}
          onPress={() => router.push({ pathname: '/(tabs)/consorcio', params: { filter: 'vencidos' } })}
        />
        <ScoreCard
          title="Certificados"
          status="PDF generados"
          value={counts.certificados}
          icon={CheckCircle2}
          color="#16A344"
          bg={skin.isDark ? '#052e16' : '#dcfce7'}
          onPress={() => router.push('/(tabs)/medicion')}
        />
        <ScoreCard
          title="Sin Protocolo"
          status="Por medir en app"
          value={counts.pendientes}
          icon={Clock}
          color="#F59E0B"
          bg={skin.isDark ? '#451a03' : '#fef3c7'}
          onPress={() => router.push({ pathname: '/(tabs)/consorcio', params: { filter: 'pendientes' } })}
        />
        <ScoreCard
          title="Consorcios"
          status={`${counts.proximos} vencen ≤60 días`}
          value={counts.total}
          icon={Building2}
          color={skin.primary}
          bg={skin.primaryLight}
          onPress={() => router.push({ pathname: '/(tabs)/consorcio', params: { filter: 'todos' } })}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={[styles.sectionLabel, { color: skin.textSecondary }]}>ACCIONES RÁPIDAS</Text>
        <TouchableOpacity
          style={[styles.mainActionBtn, { backgroundColor: skin.primary }]}
          onPress={() => router.push('/medicion/select')}
        >
          <Plus size={20} color="#fff" strokeWidth={3} />
          <Text style={styles.mainActionText}>NUEVA MEDICIÓN DE CAMPO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryActionBtn,
            { backgroundColor: skin.cardBg, borderColor: skin.border },
          ]}
          onPress={() => router.push('/(tabs)/calendario')}
        >
          <Calendar size={18} color={skin.textPrimary} />
          <Text style={[styles.secondaryActionText, { color: skin.textPrimary }]}>
            CALENDARIO DE VENCIMIENTOS
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pendingSection}>
        <Text style={[styles.sectionLabel, { color: skin.textSecondary }]}>
          PRÓXIMO CONSORCIO SIN MEDICIÓN
        </Text>
        {nextPending ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/consorcio/[id]', params: { id: nextPending.id } })}
          >
            <Surface
              style={[
                styles.incompleteCard,
                { backgroundColor: skin.cardBg, borderColor: skin.border },
              ]}
              elevation={1}
            >
              <View style={styles.incompleteHeader}>
                <Surface
                  style={[
                    styles.incompleteIcon,
                    { backgroundColor: skin.isDark ? '#451a03' : '#fff7ed' },
                  ]}
                  elevation={0}
                >
                  <Building2 size={20} color="#F59E0B" />
                </Surface>
                <View style={styles.incompleteInfo}>
                  <Text style={[styles.incompleteTitle, { color: skin.textPrimary }]}>
                    {nextPending.direccion}
                  </Text>
                  <Text style={[styles.incompleteSub, { color: skin.textSecondary }]}>
                    {nextPending.locacion_medicion_default || nextPending.solicitante}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: skin.isDark ? '#451a03' : '#fff7ed' },
                  ]}
                >
                  <Text style={styles.statusPillText}>Sin protocolo</Text>
                </View>
              </View>
              <Text style={[styles.incompleteMeta, { color: skin.textSecondary }]}>
                Toca para ver la ficha técnica o iniciar medición ({counts.pendientes} sin protocolo en total)
              </Text>
            </Surface>
          </TouchableOpacity>
        ) : (
          <Surface
            style={[
              styles.incompleteCard,
              { backgroundColor: skin.cardBg, borderColor: skin.border },
            ]}
            elevation={1}
          >
            <Text style={[styles.emptyText, { color: skin.textSecondary }]}>
              Todos los consorcios del padrón tienen al menos una medición registrada.
            </Text>
          </Surface>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 12,
    marginBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  scoreCard: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '50%',
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  versionBadge: {
    backgroundColor: '#1F4FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skinQuickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  skinQuickText: {
    fontSize: 11,
    fontWeight: '900',
  },
  versionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scoreInner: {
    padding: 16,
  },
  scoreIconArea: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreData: {},
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  scoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  scoreStatus: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  quickActions: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 14,
  },
  mainActionBtn: {
    backgroundColor: '#1F4FFF',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  mainActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryActionBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryActionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  pendingSection: {},
  incompleteCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  incompleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  incompleteIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incompleteInfo: {
    flex: 1,
  },
  incompleteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  incompleteSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '900',
  },
  incompleteMeta: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 52,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
});
