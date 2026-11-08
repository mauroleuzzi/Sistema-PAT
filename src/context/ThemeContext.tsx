import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Sun, Moon, Eye, ShieldCheck, Check, Palette } from 'lucide-react-native';
import { loadLocalState, saveLocalState } from '../db/sqlite';

export type SkinId = 'corporativo' | 'nocturno' | 'campo_sol' | 'industrial';

export interface SkinPalette {
  id: SkinId;
  name: string;
  shortLabel: string;
  subtitle: string;
  isDark: boolean;
  bg: string;
  background: string;
  surface: string;
  cardBg: string;
  surfaceAlt: string;
  inputBg: string;
  border: string;
  text: string;
  textPrimary: string;
  textMuted: string;
  textSecondary: string;
  primary: string;
  primarySoft: string;
  primaryLight: string;
  headerBg: string;
  headerText: string;
  tabBarBg: string;
  tabBarInactive: string;
  previewColors: [string, string, string];
}

export const SKINS: Record<SkinId, SkinPalette> = {
  corporativo: {
    id: 'corporativo',
    name: 'Modo Día Corporativo',
    shortLabel: 'Día',
    subtitle: 'Diseño limpio azul y blanco para oficina y gabinete',
    isDark: false,
    bg: '#F1F5F9',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    inputBg: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    textPrimary: '#0F172A',
    textMuted: '#64748B',
    textSecondary: '#64748B',
    primary: '#1F4FFF',
    primarySoft: '#EFF6FF',
    primaryLight: '#EFF6FF',
    headerBg: '#0F172A',
    headerText: '#FFFFFF',
    tabBarBg: '#FFFFFF',
    tabBarInactive: '#94A3B8',
    previewColors: ['#0F172A', '#1F4FFF', '#FFFFFF'],
  },
  nocturno: {
    id: 'nocturno',
    name: 'Modo Noche / Subsuelo (Dark)',
    shortLabel: 'Noche',
    subtitle: 'Ideal para salas de medidores en sótanos oscuros y ahorro OLED',
    isDark: true,
    bg: '#0B1120',
    background: '#0B1120',
    surface: '#1E293B',
    cardBg: '#1E293B',
    surfaceAlt: '#0F172A',
    inputBg: '#0F172A',
    border: '#334155',
    text: '#F8FAFC',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    textSecondary: '#94A3B8',
    primary: '#3B82F6',
    primarySoft: '#1E3A8A',
    primaryLight: '#1E3A8A',
    headerBg: '#020617',
    headerText: '#F8FAFC',
    tabBarBg: '#0F172A',
    tabBarInactive: '#64748B',
    previewColors: ['#0B1120', '#1E293B', '#3B82F6'],
  },
  campo_sol: {
    id: 'campo_sol',
    name: 'Alto Contraste (Luz Solar)',
    shortLabel: 'Sol',
    subtitle: 'Bordes reforzados y contraste máximo para exteriores al sol',
    isDark: false,
    bg: '#FEFCE8',
    background: '#FEFCE8',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    surfaceAlt: '#FEF9C3',
    inputBg: '#FFFFFF',
    border: '#0F172A',
    text: '#000000',
    textPrimary: '#000000',
    textMuted: '#334155',
    textSecondary: '#334155',
    primary: '#0284C7',
    primarySoft: '#E0F2FE',
    primaryLight: '#E0F2FE',
    headerBg: '#000000',
    headerText: '#FEF08A',
    tabBarBg: '#FFFFFF',
    tabBarInactive: '#475569',
    previewColors: ['#000000', '#0284C7', '#FEFCE8'],
  },
  industrial: {
    id: 'industrial',
    name: 'Ingeniería Esmeralda',
    shortLabel: 'Esmeralda',
    subtitle: 'Estética instrumental eléctrica con acentos verde seguridad',
    isDark: false,
    bg: '#ECFDF5',
    background: '#ECFDF5',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    surfaceAlt: '#F0FDF4',
    inputBg: '#FFFFFF',
    border: '#A7F3D0',
    text: '#064E3B',
    textPrimary: '#064E3B',
    textMuted: '#047857',
    textSecondary: '#047857',
    primary: '#059669',
    primarySoft: '#D1FAE5',
    primaryLight: '#D1FAE5',
    headerBg: '#064E3B',
    headerText: '#ECFDF5',
    tabBarBg: '#FFFFFF',
    tabBarInactive: '#6EE7B7',
    previewColors: ['#064E3B', '#059669', '#ECFDF5'],
  },
};

const KEY_SKIN = 'pat_skin_id_v1';

interface ThemeContextType {
  skinId: SkinId;
  skin: SkinPalette;
  setSkinId: (id: SkinId) => void;
  cycleSkin: () => void;
  skinModalVisible: boolean;
  setSkinModalVisible: (visible: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const SkinProvider = ({ children }: { children: ReactNode }) => {
  const [skinId, setSkinIdState] = useState<SkinId>(() => {
    const saved = loadLocalState<string>(KEY_SKIN, 'corporativo');
    return (saved && saved in SKINS ? saved : 'corporativo') as SkinId;
  });
  const [skinModalVisible, setSkinModalVisible] = useState(false);

  const skin = SKINS[skinId] || SKINS.corporativo;

  const setSkinId = (id: SkinId) => {
    setSkinIdState(id);
    saveLocalState(KEY_SKIN, id);
  };

  const cycleSkin = () => {
    const order: SkinId[] = ['corporativo', 'nocturno', 'campo_sol', 'industrial'];
    const nextIdx = (order.indexOf(skinId) + 1) % order.length;
    setSkinId(order[nextIdx]);
  };

  // En Web/PWA inyectamos variables CSS y reglas adaptativas para que toda la UI responda al instante al Skin elegido
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let styleEl = document.getElementById('pat-skin-stylesheet') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'pat-skin-stylesheet';
      document.head.appendChild(styleEl);
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', skin.headerBg);
    }

    if (skin.isDark) {
      styleEl.textContent = `
        body, #root { background-color: ${skin.bg} !important; color: ${skin.text} !important; }
        /* Superficies y contenedores blancos pasan a superficie oscura */
        div[style*="background-color: rgb(241, 245, 249)"],
        div[style*="background-color: rgb(248, 250, 252)"],
        div[style*="background-color: rgb(245, 245, 245)"] {
          background-color: ${skin.bg} !important;
        }
        div[style*="background-color: rgb(255, 255, 255)"] {
          background-color: ${skin.surface} !important;
          border-color: ${skin.border} !important;
        }
        /* Textos oscuros pasan a texto claro en Modo Noche */
        div[style*="color: rgb(15, 23, 42)"],
        div[style*="color: rgb(30, 41, 59)"],
        div[style*="color: rgb(51, 65, 85)"],
        span[style*="color: rgb(15, 23, 42)"],
        h1[style*="color: rgb(15, 23, 42)"] {
          color: ${skin.text} !important;
        }
        div[style*="color: rgb(100, 116, 139)"],
        div[style*="color: rgb(71, 85, 105)"] {
          color: ${skin.textMuted} !important;
        }
        input, textarea {
          color: ${skin.text} !important;
          background-color: ${skin.surfaceAlt} !important;
        }
      `;
    } else if (skin.id === 'campo_sol') {
      styleEl.textContent = `
        body, #root { background-color: ${skin.bg} !important; }
        div[style*="background-color: rgb(241, 245, 249)"] {
          background-color: ${skin.bg} !important;
        }
        div[style*="background-color: rgb(255, 255, 255)"] {
          border-color: #0F172A !important;
        }
      `;
    } else if (skin.id === 'industrial') {
      styleEl.textContent = `
        body, #root { background-color: ${skin.bg} !important; }
        div[style*="background-color: rgb(241, 245, 249)"] {
          background-color: ${skin.bg} !important;
        }
        div[style*="background-color: rgb(31, 79, 255)"] {
          background-color: ${skin.primary} !important;
        }
      `;
    } else {
      styleEl.textContent = '';
    }
  }, [skin]);

  const renderSkinIcon = (id: SkinId, color: string) => {
    switch (id) {
      case 'nocturno':
        return <Moon size={20} color={color} />;
      case 'campo_sol':
        return <Eye size={20} color={color} />;
      case 'industrial':
        return <ShieldCheck size={20} color={color} />;
      default:
        return <Sun size={20} color={color} />;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        skinId,
        skin,
        setSkinId,
        cycleSkin,
        skinModalVisible,
        setSkinModalVisible,
      }}
    >
      {children}

      {/* MODAL GLOBAL DE SELECCIÓN DE SKINS / TEMAS */}
      <Modal
        visible={skinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSkinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface
            style={[
              styles.modalCard,
              { backgroundColor: skin.surface, borderColor: skin.border, borderWidth: 1 },
            ]}
            elevation={5}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconBox, { backgroundColor: skin.primarySoft }]}>
                  <Palette size={20} color={skin.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: skin.text }]}>
                    Apariencia y Skins Visuales
                  </Text>
                  <Text style={[styles.modalSub, { color: skin.textMuted }]}>
                    Adaptá la interfaz al entorno de trabajo (Sótano, Sol u Oficina)
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 10, marginVertical: 14 }}>
              {(Object.keys(SKINS) as SkinId[]).map(key => {
                const item = SKINS[key];
                const active = skinId === key;
                return (
                  <TouchableOpacity
                    key={key}
                    testID={`skin-option-${key}`}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSkinId(key);
                      setSkinModalVisible(false);
                    }}
                    style={[
                      styles.skinOptionCard,
                      {
                        backgroundColor: item.isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: active ? item.primary : '#CBD5E1',
                        borderWidth: active ? 2.5 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.skinIconCircle,
                        { backgroundColor: item.headerBg },
                      ]}
                    >
                      {renderSkinIcon(key, '#FFFFFF')}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '900',
                          color: item.isDark ? '#F8FAFC' : '#0F172A',
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: item.isDark ? '#94A3B8' : '#64748B',
                          marginTop: 2,
                        }}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={styles.swatchesRow}>
                      {item.previewColors.map((hex, i) => (
                        <View
                          key={i}
                          style={[styles.swatchDot, { backgroundColor: hex }]}
                        />
                      ))}
                    </View>
                    {active && (
                      <View style={[styles.activeCheck, { backgroundColor: item.primary }]}>
                        <Check size={14} color="#FFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: skin.primary }]}
              onPress={() => setSkinModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>LISTO</Text>
            </TouchableOpacity>
          </Surface>
        </View>
      </Modal>
    </ThemeContext.Provider>
  );
};

export const useSkin = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useSkin must be used within a SkinProvider');
  return ctx;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  skinOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  skinIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});

