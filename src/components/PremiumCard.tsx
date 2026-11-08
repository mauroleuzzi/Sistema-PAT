import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { LucideIcon } from 'lucide-react-native';

interface PremiumCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const PremiumCard = ({ title, value, subtitle, icon: Icon, color, onPress, style }: PremiumCardProps) => {
  const theme = useTheme();

  return (
    <Surface
      style={[
        styles.card,
        { borderLeftColor: color, borderLeftWidth: 5 },
        style
      ]}
      elevation={2}
    >
      <Pressable 
        onPress={onPress} 
        style={({ pressed }) => [
          styles.pressable,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <Icon size={24} color={color} />
          </View>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{value}</Text>
        </View>
        <View style={styles.content}>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text>
        </View>
      </Pressable>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  pressable: {
    padding: 16,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 10,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
  },
  content: {
    marginTop: 4,
  },
  title: {
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 2,
    opacity: 0.6,
  },
});
