import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Title, Surface } from 'react-native-paper';
import { ChevronLeft, ChevronRight, Building2, Calendar as CalendarIcon } from 'lucide-react-native';
import { useDemo } from '../../../src/context/DemoContext';
import { useSkin } from '../../../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { formatDate, getConsorcioStatus } from '../../../src/lib/utils';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function Calendario() {
  const { consorcios, administraciones, mediciones } = useDemo();
  const { skin } = useSkin();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'mensual' | 'lista'>('mensual');

  // Inicializar en Abril 2026 si hay eventos allí, o el mes actual
  const [currentMonth, setCurrentMonth] = useState(3); // Abril (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');

  const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const measuredIds = useMemo(() => new Set(mediciones.map(m => m.consorcio_id)), [mediciones]);

  const cycleAdmin = () => {
    if (selectedAdminId === 'all') {
      if (administraciones.length > 0) setSelectedAdminId(administraciones[0].id);
    } else {
      const idx = administraciones.findIndex(a => a.id === selectedAdminId);
      if (idx >= 0 && idx < administraciones.length - 1) {
        setSelectedAdminId(administraciones[idx + 1].id);
      } else {
        setSelectedAdminId('all');
      }
    }
  };

  const changeMonth = (delta: number) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setCurrentMonth(m);
    setCurrentYear(y);
    setSelectedDay(null);
  };

  const filteredConsorcios = useMemo(() => {
    return consorcios.filter(c => {
      if (selectedAdminId !== 'all' && c.administracion_id !== selectedAdminId) return false;
      return Boolean(c.vencimiento_proximo);
    });
  }, [consorcios, selectedAdminId]);

  const allEvents = useMemo(() => {
    return filteredConsorcios
      .map(c => {
        const parts = (c.vencimiento_proximo || '').split('-').map(Number);
        if (parts.length !== 3) return null;
        const [y, m, d] = parts;
        const st = getConsorcioStatus(c, measuredIds.has(c.id));
        const adminObj = administraciones.find(a => a.id === c.administracion_id);
        return {
          id: c.id,
          year: y,
          month: m - 1,
          day: d,
          dateStr: c.vencimiento_proximo!,
          address: c.direccion,
          solicitante: adminObj?.nombre || c.solicitante,
          status: st.label,
          color: st.color,
          bg: st.bg,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [filteredConsorcios, measuredIds, administraciones]);

  // Meses con vencimientos para atajos rápidos
  const activeMonths = useMemo(() => {
    const map = new Map<string, { year: number; month: number; count: number }>();
    allEvents.forEach(e => {
      const key = `${e.year}-${e.month}`;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { year: e.year, month: e.month, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
  }, [allEvents]);

  const currentMonthEvents = useMemo(
    () => allEvents.filter(e => e.year === currentYear && e.month === currentMonth),
    [allEvents, currentYear, currentMonth]
  );

  const displayedEventsBelowGrid = useMemo(() => {
    if (selectedDay !== null) {
      return currentMonthEvents.filter(e => e.day === selectedDay);
    }
    return currentMonthEvents.slice().sort((a, b) => a.day - b.day);
  }, [currentMonthEvents, selectedDay]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Día de la semana del día 1 (0 = Lunes ... 6 = Domingo)
  const firstDayOffset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  const renderGrid = () => {
    const cells = [];
    for (let emptyIdx = 0; emptyIdx < firstDayOffset; emptyIdx++) {
      cells.push(<View key={`empty-${emptyIdx}`} style={[styles.cell, styles.cellEmpty]} />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dayEvents = currentMonthEvents.filter(e => e.day === i);
      const isSelected = selectedDay === i;
      const hasEvents = dayEvents.length > 0;
      cells.push(
        <TouchableOpacity
          key={i}
          activeOpacity={0.75}
          onPress={() => setSelectedDay(prev => (prev === i ? null : i))}
          style={[
            styles.cell,
            hasEvents && styles.cellWithEvents,
            isSelected && styles.cellSelected,
          ]}
        >
          <Text
            style={[
              styles.dayNum,
              hasEvents && { fontWeight: '900', color: '#0f172a' },
              isSelected && { color: '#fff', fontWeight: '900' },
            ]}
          >
            {i}
          </Text>
          {hasEvents && (
            <View style={styles.dotsRow}>
              {dayEvents.slice(0, 3).map(ev => (
                <View
                  key={ev.id}
                  style={[
                    styles.eventDot,
                    { backgroundColor: isSelected ? '#fff' : ev.color },
                  ]}
                />
              ))}
              {dayEvents.length > 1 && (
                <Text
                  style={[
                    styles.eventCountText,
                    isSelected && { color: '#fff' },
                  ]}
                >
                  {dayEvents.length}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }
    return cells;
  };

  const selectedAdminLabel =
    selectedAdminId === 'all'
      ? 'Todas las administraciones'
      : administraciones.find(a => a.id === selectedAdminId)?.nombre || 'Administración';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: skin.background }]}
      contentContainerStyle={styles.content}
    >
      <Title style={[styles.title, { color: skin.textPrimary }]}>
        Calendario de Vencimientos
      </Title>

      <View style={styles.selectors}>
        <Surface
          style={[
            styles.selector,
            { backgroundColor: skin.cardBg, borderColor: skin.border },
          ]}
          elevation={1}
        >
          <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 6 }}>
            <ChevronLeft size={18} color={skin.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.selectorText, { color: skin.textPrimary }]}>
            {MONTHS_ES[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 6 }}>
            <ChevronRight size={18} color={skin.textPrimary} />
          </TouchableOpacity>
        </Surface>
        <TouchableOpacity style={{ flex: 1 }} onPress={cycleAdmin}>
          <Surface
            style={[
              styles.selector,
              { backgroundColor: skin.cardBg, borderColor: skin.border },
            ]}
            elevation={1}
          >
            <Text style={[styles.selectorText, { color: skin.textPrimary }]} numberOfLines={1}>
              {selectedAdminLabel}
            </Text>
            <ChevronRight size={16} color={skin.textSecondary} />
          </Surface>
        </TouchableOpacity>
      </View>

      {/* Atajos a meses con vencimientos */}
      {activeMonths.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {activeMonths.map(m => {
            const active = m.year === currentYear && m.month === currentMonth;
            return (
              <TouchableOpacity
                key={`${m.year}-${m.month}`}
                onPress={() => {
                  setCurrentYear(m.year);
                  setCurrentMonth(m.month);
                  setSelectedDay(null);
                }}
                style={[styles.monthJumpChip, active && styles.monthJumpChipActive]}
              >
                <CalendarIcon size={12} color={active ? '#fff' : '#1F4FFF'} />
                <Text style={[styles.monthJumpText, active && { color: '#fff' }]}>
                  {MONTHS_ES[m.month].slice(0, 3)} {m.year} ({m.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={[styles.badgeText, { color: '#DC2626' }]}>Vencidos</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Próximos (≤60d)</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#16A344' }]} />
          <Text style={[styles.badgeText, { color: '#16A344' }]}>Al día</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'mensual' && styles.toggleActive]}
          onPress={() => setViewMode('mensual')}
        >
          <Text style={[styles.toggleText, viewMode === 'mensual' && styles.toggleTextActive]}>
            Grilla Mensual ({currentMonthEvents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'lista' && styles.toggleActive]}
          onPress={() => setViewMode('lista')}
        >
          <Text style={[styles.toggleText, viewMode === 'lista' && styles.toggleTextActive]}>
            Lista Anual ({allEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'mensual' ? (
        <>
          <Surface style={styles.calendarCard} elevation={2}>
            <View style={styles.daysHeader}>
              {days.map(d => (
                <Text key={d} style={styles.dayLabel}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>{renderGrid()}</View>
          </Surface>

          {/* Detalle legible debajo de la grilla */}
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailHeaderTitle}>
              {selectedDay !== null
                ? `VENCIMIENTOS DEL ${selectedDay} DE ${MONTHS_ES[currentMonth].toUpperCase()}`
                : `VENCIMIENTOS DE ${MONTHS_ES[currentMonth].toUpperCase()} ${currentYear} (${currentMonthEvents.length})`}
            </Text>
            {selectedDay !== null && (
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F4FFF' }}>
                  Ver todo el mes
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {displayedEventsBelowGrid.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={1}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b' }}>
                No hay vencimientos programados en este período.
              </Text>
            </Surface>
          ) : (
            <View style={{ gap: 10 }}>
              {displayedEventsBelowGrid.map(ev => (
                <Surface key={ev.id} style={styles.eventCard} elevation={1}>
                  <TouchableOpacity
                    style={styles.eventCardInner}
                    onPress={() => router.push({ pathname: '/consorcio/[id]', params: { id: ev.id } })}
                  >
                    <View style={styles.eventDayBadge}>
                      <Text style={styles.eventDayNum}>{String(ev.day).padStart(2, '0')}</Text>
                      <Text style={styles.eventDayMonth}>{MONTHS_ES[ev.month].slice(0, 3).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventCardTitle}>{ev.address}</Text>
                      <Text style={styles.eventCardSub}>{ev.solicitante}</Text>
                      <View style={[styles.statusPill, { backgroundColor: ev.bg }]}>
                        <Text style={[styles.statusPillText, { color: ev.color }]}>{ev.status}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.measureMiniBtn}
                      onPress={() => router.push({ pathname: '/medicion/nueva', params: { id: ev.id } })}
                    >
                      <Text style={styles.measureMiniBtnText}>MEDIR</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Surface>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={{ gap: 10 }}>
          {allEvents
            .slice()
            .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
            .map(ev => (
              <Surface key={ev.id} style={styles.eventCard} elevation={1}>
                <TouchableOpacity
                  style={styles.eventCardInner}
                  onPress={() => router.push({ pathname: '/consorcio/[id]', params: { id: ev.id } })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Building2 size={20} color="#0f172a" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventCardTitle}>{ev.address}</Text>
                      <Text style={styles.eventCardSub}>
                        Vence: {formatDate(ev.dateStr)} • {ev.solicitante}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: ev.bg, marginTop: 0 }]}>
                    <Text style={[styles.statusPillText, { color: ev.color }]}>{ev.status}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.measureMiniBtn}
                    onPress={() => router.push({ pathname: '/medicion/nueva', params: { id: ev.id } })}
                  >
                    <Text style={styles.measureMiniBtnText}>MEDIR</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Surface>
            ))}
        </View>
      )}
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
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
  },
  selectors: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  selector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  monthJumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  monthJumpChipActive: {
    backgroundColor: '#1F4FFF',
    borderColor: '#1F4FFF',
  },
  monthJumpText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F4FFF',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#1F4FFF',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  toggleTextActive: {
    color: '#fff',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  daysHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.2857%',
    height: 54,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  cellEmpty: {
    backgroundColor: '#F8FAFC',
  },
  cellWithEvents: {
    backgroundColor: '#eff6ff',
  },
  cellSelected: {
    backgroundColor: '#1F4FFF',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eventCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1e293b',
    marginLeft: 2,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventDayBadge: {
    width: 46,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDayNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  eventDayMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  eventCardSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  measureMiniBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  measureMiniBtnText: {
    color: '#1F4FFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
