import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { initDB } from '../src/db/sqlite';
import { DemoProvider } from '../src/context/DemoContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SkinProvider, useSkin } from '../src/context/ThemeContext';

const queryClient = new QueryClient();

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inLoginScreen = segments[0] === 'login';
    if (!isAuthenticated && !inLoginScreen) {
      router.replace('/login');
    } else if (isAuthenticated && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

function SafeBackButton({ tintColor }: { tintColor?: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      testID="header-back-btn"
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      style={{ paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}
    >
      <ArrowLeft size={22} color={tintColor || '#fff'} />
    </TouchableOpacity>
  );
}

function ThemedAppStack() {
  const { skin } = useSkin();
  const baseTheme = skin.isDark ? MD3DarkTheme : MD3LightTheme;

  const paperTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: skin.primary,
      secondary: '#F59E0B',
      tertiary: '#16A344',
      error: '#DC2626',
      background: skin.bg,
      surface: skin.surface,
      onSurface: skin.text,
    },
    roundness: 12,
  };

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationGuard>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: skin.headerBg,
            },
            headerTintColor: skin.headerText,
            headerTitleStyle: {
              fontWeight: '900',
              fontSize: 19,
            },
            contentStyle: {
              backgroundColor: skin.bg,
            },
            headerLeft: ({ tintColor }) => <SafeBackButton tintColor={tintColor} />,
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="medicion/select" options={{ title: 'Seleccionar Consorcio' }} />
          <Stack.Screen name="medicion/nueva" options={{ title: 'Medición PAT' }} />
          <Stack.Screen name="consorcio/[id]" options={{ title: 'Ficha del Consorcio' }} />
          <Stack.Screen name="importar-masivo" options={{ title: 'Importación Masiva' }} />
        </Stack>
      </NavigationGuard>
    </PaperProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    try {
      initDB();
    } catch (e) {
      console.error('Failed to initialize database', e);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DemoProvider>
          <SkinProvider>
            <ThemedAppStack />
          </SkinProvider>
        </DemoProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
