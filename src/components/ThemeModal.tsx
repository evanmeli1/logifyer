import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, themeColors, ThemeColor } from '../theme';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

interface ThemeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Free themes
const freeThemes: ThemeColor[] = ['rose', 'ocean'];

export default function ThemeModal({ visible, onClose, onUpgrade }: ThemeModalProps) {
  const { theme, themeColor, themeMode, resolvedMode, isPremium, setThemeColor, setThemeMode } = useTheme();

  // Validate theme context is available
  if (!theme || !setThemeColor || !setThemeMode) {
    console.error('ThemeModal: Theme context is not properly initialized');
    return null;
  }

  const colorOptions = Object.entries(themeColors) as [ThemeColor, typeof themeColors[ThemeColor]][];

  // Memoize color selection to prevent unnecessary re-renders
  const handleColorSelect = useCallback((color: ThemeColor) => {
    try {
      const colorData = themeColors[color];
      
      // Validate color exists in themeColors
      if (!colorData) {
        console.error(`ThemeModal: Invalid color selection: ${color}`);
        return;
      }

      // Check if premium is required
      if (colorData.premium && !isPremium) {
        onUpgrade();
        return;
      }

      // Update theme color
      setThemeColor(color);
    } catch (error) {
      console.error('ThemeModal: Error selecting color:', error);
      Alert.alert(
        'Theme Error',
        'Could not change theme. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [isPremium, setThemeColor, onUpgrade]);

  // Safe close handler with error boundary
  const handleClose = useCallback(() => {
    try {
      onClose();
    } catch (error) {
      console.error('ThemeModal: Error closing modal:', error);
    }
  }, [onClose]);

  // Safe upgrade handler
  const handleUpgrade = useCallback(() => {
    try {
      onUpgrade();
    } catch (error) {
      console.error('ThemeModal: Error navigating to upgrade:', error);
      Alert.alert(
        'Navigation Error',
        'Could not open upgrade screen. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [onUpgrade]);

  // Validate colorOptions has data
  if (!colorOptions || colorOptions.length === 0) {
    console.error('ThemeModal: No color options available');
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <AnimatedPressable 
        entering={FadeIn.duration(50)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay} 
        onPress={handleClose}
        accessible={true}
        accessibilityLabel="Close theme modal"
        accessibilityRole="button"
      >
        <Animated.View 
          key={`${resolvedMode}-${themeColor}`}
          entering={SlideInDown.springify().damping(25).stiffness(200)}
          style={[styles.container, { backgroundColor: theme.card }]}
        >
          <Pressable 
            onPress={(e) => e.stopPropagation()}
            accessible={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Personalize Theme</Text>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeText, { color: theme.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Dark Mode Toggle */}
            <View style={[styles.darkModeRow, { borderBottomColor: theme.divider }]}>
              <View style={styles.darkModeInfo}>
                <Text style={styles.darkModeIcon}>{resolvedMode === 'dark' ? '🌙' : '☀️'}</Text>
                <View>
                  <Text style={[styles.darkModeTitle, { color: theme.text }]}>Dark Mode</Text>
                  <Text style={[styles.darkModeSubtitle, { color: theme.textMuted }]}>
                    {resolvedMode === 'dark' ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>

              <Switch
                value={resolvedMode === 'dark'}
                onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')}
                trackColor={{ false: '#E5E7EB', true: theme.primary + '60' }}
                thumbColor={resolvedMode === 'dark' ? theme.primary : '#FFFFFF'}
              />


            </View>


            {/* Color Options */}
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ACCENT COLOR</Text>
            
            <View style={styles.colorsGrid}>
              {colorOptions.map(([key, data]) => {
                // Safety checks for data integrity
                if (!data || !data.name || !data.primary || !data.primaryLight) {
                  console.warn(`ThemeModal: Invalid theme data for ${key}`);
                  return null;
                }

                const isSelected = themeColor === key;
                const isLocked = data.premium && !isPremium;
                const isFree = freeThemes.includes(key);
                
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.colorOption}
                    onPress={() => handleColorSelect(key)}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityLabel={`${data.name} theme${isLocked ? ', premium required' : ''}${isSelected ? ', selected' : ''}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: isLocked }}
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
                    {data.premium && !isFree && (
                      <View style={[styles.premiumBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.premiumText, { color: theme.primary }]}>PRO</Text>
                      </View>
                    )}
                    {isFree && (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>Free</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Upgrade CTA for non-premium */}
            {!isPremium && (
              <TouchableOpacity 
                onPress={handleUpgrade} 
                activeOpacity={0.8}
                accessible={true}
                accessibilityLabel="Unlock all premium themes"
                accessibilityRole="button"
              >
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
    maxHeight: '90%', // Prevent overflow on small screens
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
    minWidth: 80, // Prevent too small on very small screens
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
    textAlign: 'center',
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
  freeBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#10B981',
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