import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings, updateSettings } from '../database/db';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';

export default function GlobalSettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [majorMultiplier, setMajorMultiplier] = useState(3);
  const [timeDecayMonths, setTimeDecayMonths] = useState(6);
  const [recencyBoostEnabled, setRecencyBoostEnabled] = useState(true);

  useEffect(() => {
    const settings: any = getSettings();
    if (settings) {
      setMajorMultiplier(settings.major_multiplier);
      setTimeDecayMonths(settings.time_decay_months);
      setRecencyBoostEnabled(settings.recency_boost_enabled === 1);
    }
  }, []);

  const handleSave = () => {
    updateSettings(majorMultiplier, timeDecayMonths, recencyBoostEnabled);
    Alert.alert('Success', 'Settings saved!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scoring Settings</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Major Incident Multiplier */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.icon}>⚡</Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Major Multiplier</Text>
              <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
                Impact of major incidents
              </Text>
            </View>
          </View>
          
          <View style={[styles.valueDisplay, { backgroundColor: theme.primary + '10' }]}>
            <Text style={[styles.valueText, { color: theme.primary }]}>{majorMultiplier}x</Text>
            <Text style={[styles.valueLabel, { color: theme.textMuted }]}>multiplier</Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={2}
              maximumValue={5}
              step={1}
              value={majorMultiplier}
              onValueChange={setMajorMultiplier}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.divider}
              thumbTintColor={theme.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>2x</Text>
              <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>5x</Text>
            </View>
          </View>
        </View>

        {/* Time Decay */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '15' }]}>
              <Text style={styles.icon}>⏳</Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Time Decay</Text>
              <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
                Old incidents fade over time
              </Text>
            </View>
          </View>
          
          <View style={styles.optionGroup}>
            {[
              { value: 0, label: 'Off', sublabel: 'No decay' },
              { value: 6, label: '6 mo', sublabel: 'Recommended' },
              { value: 12, label: '12 mo', sublabel: 'Slow decay' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  { borderColor: theme.divider, backgroundColor: theme.card },
                  timeDecayMonths === option.value && { 
                    borderColor: theme.primary, 
                    backgroundColor: theme.primary + '10' 
                  }
                ]}
                onPress={() => setTimeDecayMonths(option.value)}
              >
                <Text style={[
                  styles.optionLabel,
                  { color: theme.text },
                  timeDecayMonths === option.value && { color: theme.primary }
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionSublabel,
                  { color: theme.textMuted },
                  timeDecayMonths === option.value && { color: theme.primary }
                ]}>
                  {option.sublabel}
                </Text>
                {timeDecayMonths === option.value && (
                  <View style={[styles.selectedDot, { backgroundColor: theme.primary }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recency Boost */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={styles.toggleCard}
            onPress={() => setRecencyBoostEnabled(!recencyBoostEnabled)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '15' }]}>
              <Text style={styles.icon}>🚀</Text>
            </View>
            <View style={styles.toggleInfo}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Recency Boost</Text>
              <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
                Last 30 days count 1.5x more
              </Text>
            </View>
            <View style={[
              styles.toggle,
              { backgroundColor: recencyBoostEnabled ? '#10B981' : theme.divider }
            ]}>
              <View style={[
                styles.toggleThumb,
                recencyBoostEnabled && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.primary + '08' }]}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            These settings affect how relationship scores are calculated. Changes apply to all future calculations.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 24,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  valueDisplay: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  valueText: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
  },
  valueLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: -2,
  },
  sliderContainer: {
    paddingHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  optionSublabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});