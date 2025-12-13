import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

interface StreakBadgeProps {
  current: number;
  longest: number;
  emoji: string;
  message: string;
  onPress?: () => void;
}

export default function StreakBadge({ current, longest, emoji, message, onPress }: StreakBadgeProps) {
  const { theme } = useTheme();
  
  if (current === 0 && longest === 0) {
    return null; // Don't show until they have at least logged once
  }
  
  return (
    <TouchableOpacity 
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <LinearGradient
        colors={[theme.primary + '15', theme.primaryLight + '10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={styles.textSection}>
              <Text style={[styles.streakNumber, { color: theme.primary }]}>
                {current} {current === 1 ? 'Day' : 'Days'}
              </Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                {message}
              </Text>
            </View>
          </View>
          
          {longest > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>
                Best: {longest}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  textSection: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});