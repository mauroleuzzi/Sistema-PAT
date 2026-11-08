import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { Shield, Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, Zap, UserCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { checkSupabaseConnection } from '../src/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<{ connected: boolean; text: string }>({
    connected: true,
    text: 'Verificando servidor Supabase...',
  });

  useEffect(() => {
    let active = true;
    checkSupabaseConnection().then(res => {
      if (active) {
        setCloudStatus({
          connected: res.connected,
          text: res.connected
            ? `Servidor Cloud Online (${res.latencyMs} ms)`
            : 'Modo Offline-First Activo',
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (customEmail?: string, customPass?: string) => {
    const targetEmail = customEmail ?? email;
    const targetPass = customPass ?? password;
    setErrorMsg(null);
    setSubmitting(true);

    const result = await signIn(targetEmail, targetPass);
    setSubmitting(false);

    if (result.ok) {
      router.replace('/(tabs)');
    } else {
      setErrorMsg(result.error || 'No se pudo iniciar sesión.');
    }
  };

  const fillPreset = (presetRole: 'admin' | 'tecnico') => {
    setErrorMsg(null);
    if (presetRole === 'admin') {
      setEmail('admin@patmediciones.com');
      setPassword('Mediciones22Pat');
    } else {
      setEmail('tecnico@patmediciones.com');
      setPassword('Mediciones22Pat');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardWrapper}>
          {/* Top Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Zap size={28} color="#fff" />
            </View>
            <View style={styles.cloudPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: cloudStatus.connected ? '#22c55e' : '#f59e0b' },
                ]}
              />
              <Text style={styles.cloudPillText}>{cloudStatus.text}</Text>
            </View>
            <Text style={styles.brandTitle}>SISTEMA PAT</Text>
            <Text style={styles.brandSubtitle}>
              Certificación y Protocolos de Puesta a Tierra • Res. SRT 900/15
            </Text>
          </View>

          {/* Login Form Card */}
          <Surface style={styles.formCard} elevation={3}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>
            <Text style={styles.formDesc}>
              Ingresá tus credenciales operativas para sincronizar consorcios, mediciones y protocolos en tiempo real.
            </Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CORREO ELECTRÓNICO</Text>
              <View style={styles.inputBox}>
                <Mail size={18} color="#64748b" />
                <TextInput
                  testID="login-email-input"
                  style={styles.textInput}
                  placeholder="admin@patmediciones.com"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
              <View style={styles.inputBox}>
                <Lock size={18} color="#64748b" />
                <TextInput
                  testID="login-password-input"
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(p => !p)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.loginBtn, submitting && { opacity: 0.7 }]}
              onPress={() => handleLogin()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Shield size={18} color="#fff" />
                  <Text style={styles.loginBtnText}>INGRESAR AL SISTEMA</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick Access Credentials Helper for Field & Third-Party Testing */}
            <View style={styles.quickAccessSection}>
              <Text style={styles.quickAccessTitle}>ACCESO RÁPIDO POR PERFIL</Text>
              <View style={styles.quickButtonsRow}>
                <TouchableOpacity
                  testID="preset-admin-btn"
                  style={styles.presetCard}
                  onPress={() => fillPreset('admin')}
                >
                  <View style={[styles.roleBadge, { backgroundColor: '#dbeafe' }]}>
                    <UserCheck size={14} color="#1F4FFF" />
                    <Text style={[styles.roleBadgeText, { color: '#1F4FFF' }]}>ADMIN</Text>
                  </View>
                  <Text style={styles.presetEmail}>admin@patmediciones.com</Text>
                  <Text style={styles.presetHint}>Ing. Daniel H. Leuzzi (Control Total)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="preset-tecnico-btn"
                  style={styles.presetCard}
                  onPress={() => fillPreset('tecnico')}
                >
                  <View style={[styles.roleBadge, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircle2 size={14} color="#16A344" />
                    <Text style={[styles.roleBadgeText, { color: '#16A344' }]}>TÉCNICO</Text>
                  </View>
                  <Text style={styles.presetEmail}>tecnico@patmediciones.com</Text>
                  <Text style={styles.presetHint}>Operador de Campo (Mediciones y PDF)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Surface>

          <Text style={styles.footerVersion}>
            Sistema PAT v2.0 PRO • Sincronización Cloud & Offline-First
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 36,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1F4FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cloudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cloudPillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  formDesc: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: '#1F4FFF',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  quickAccessSection: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  quickAccessTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  presetEmail: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  presetHint: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  footerVersion: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },
});

