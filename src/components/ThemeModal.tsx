import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { themeColors, ThemeColor } from '../theme/themes';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

interface ThemeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ThemeModal({ visible, onClose, onUpgrade }: ThemeModalProps) {
  const { theme, themeColor, themeMode, isPremium, setThemeColor, toggleDarkMode } = useTheme();

  const colorOptions = Object.entries(themeColors) as [ThemeColor, typeof themeColors[ThemeColor]][];

  const handleColorSelect = (color: ThemeColor) => {
    const colorData = themeColors[color];
    if (colorData.premium && !isPremium) {
      onUpgrade();
      return;
    }
    setThemeColor(color);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <AnimatedPressable 
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay} 
        onPress={onClose}
      >
        <Animated.View 
          entering={SlideInDown.springify().damping(20)}
          style={[styles.container, { backgroundColor: theme.card }]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Personalize Theme</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: theme.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Dark Mode Toggle */}
            <View style={[styles.darkModeRow, { borderBottomColor: theme.divider }]}>
              <View style={styles.darkModeInfo}>
                <Text style={styles.darkModeIcon}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
                <View>
                  <Text style={[styles.darkModeTitle, { color: theme.text }]}>Dark Mode</Text>
                  <Text style={[styles.darkModeSubtitle, { color: theme.textMuted }]}>
                    {themeMode === 'dark' ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
              <Switch
                value={themeMode === 'dark'}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#E5E7EB', true: theme.primary + '60' }}
                thumbColor={themeMode === 'dark' ? theme.primary : '#FFFFFF'}
              />
            </View>

            {/* Color Options */}
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ACCENT COLOR</Text>
            
            <View style={styles.colorsGrid}>
              {colorOptions.map(([key, data]) => {
                const isSelected = themeColor === key;
                const isLocked = data.premium && !isPremium;
                
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.colorOption}
                    onPress={() => handleColorSelect(key)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.colorCircleOuter,
                      isSelected && { borderColor: data.primary, borderWidth: 3 }
                    ]}>
                      <LinearGradient
                        colors={[data.primary, data.primaryLight]}
                        style={[
                          styles.colorCircle,
                          isLocked && styles.colorCircleLocked
                        ]}
                      >
                        {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
                        {isSelected && !isLocked && <Text style={styles.checkIcon}>✓</Text>}
                      </LinearGradient>
                    </View>
                    <Text style={[
                      styles.colorName,
                      { color: isSelected ? theme.text : theme.textMuted }
                    ]}>
                      {data.name}
                    </Text>
                    {data.premium && (
                      <View style={[styles.premiumBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.premiumText, { color: theme.primary }]}>PRO</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Upgrade CTA for non-premium */}
            {!isPremium && (
              <TouchableOpacity onPress={onUpgrade} activeOpacity={0.8}>
                <LinearGradient
                  colors={[theme.primary, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeButton}
                >
                  <Text style={styles.upgradeText}>Unlock All Themes</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Pressable>
        </Animated.View>
      </AnimatedPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: '600',
  },
  darkModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  darkModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  darkModeIcon: {
    fontSize: 28,
  },
  darkModeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  darkModeSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  colorOption: {
    alignItems: 'center',
    width: '28%',
  },
  colorCircleOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleLocked: {
    opacity: 0.5,
  },
  lockIcon: {
    fontSize: 18,
  },
  checkIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  colorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  premiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  upgradeButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});