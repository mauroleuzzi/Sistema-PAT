import { Stack, Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { View, ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthorized(false);
          return;
        }
        
        // Fetch role from usuarios table
        const { data: profile } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .single();

        const role = profile?.rol;
        if (role === 'admin' || role === 'superadmin') {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (e) {
        setIsAuthorized(false);
      }
    };
    checkRole();
  }, []);

  if (isAuthorized === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthorized) {
    return <Redirect href="/(tabs)/index" />;
  }

  return (
    <Stack>
      <Stack.Screen name="consorcios/index" options={{ title: 'Gestión de Consorcios' }} />
      <Stack.Screen name="consorcios/importar" options={{ title: 'Importar Consorcios' }} />
    </Stack>
  );
}
