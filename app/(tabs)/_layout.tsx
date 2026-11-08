import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Tabs, useRouter } from 'expo-router';
import {
  Home,
  ClipboardList,
  Building2,
  UserCog,
  Calendar as CalendarIcon,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useSkin } from '../../src/context/ThemeContext';

export default function TabLayout() {
  const { user, isAdmin, signOut } = useAuth();
  const { skin, setSkinModalVisible } = useSkin();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: skin.primary,
        tabBarInactiveTintColor: skin.tabBarInactive,
        headerShown: true,
        headerStyle: { backgroundColor: skin.headerBg },
        headerTintColor: skin.headerText,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderColor: skin.border,
          backgroundColor: skin.tabBarBg,
          elevation: 0,
        },
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity
              testID="header-skin-btn"
              style={styles.skinBtn}
              onPress={() => setSkinModalVisible(true)}
            >
              {skin.isDark ? (
                <Sun size={15} color="#fde047" />
              ) : (
                <Moon size={15} color="#e2e8f0" />
              )}
              <Text style={styles.skinBtnText}>Skin</Text>
            </TouchableOpacity>

            {user && (
              <View
                style={[
                  styles.roleChip,
                  { backgroundColor: isAdmin ? '#1e3a8a' : '#14532d' },
                ]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    { color: isAdmin ? '#93c5fd' : '#86efac' },
                  ]}
                >
                  {isAdmin ? 'ADMIN' : 'TÉCNICO'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              testID="header-logout-btn"
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <LogOut size={15} color="#f87171" />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medicion/index"
        options={{
          title: 'Mediciones',
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendario/index"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color }) => <CalendarIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="consorcio/index"
        options={{
          title: 'Consorcios',
          tabBarIcon: ({ color }) => <Building2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin/index"
        options={{
          title: isAdmin ? 'Admin' : 'Sincronizar',
          tabBarIcon: ({ color }) => <UserCog size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 14,
  },
  skinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  skinBtnText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '900',
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
});
