import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings, updateSettings } from '../database/db';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function GlobalSettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [majorMultiplier, setMajorMultiplier] = useState(3);

  useEffect(() => {
    const settings: any = getSettings();
    if (settings) {
      setMajorMultiplier(settings.major_multiplier);
    }
  }, []);

  const handleSave = () => {
    updateSettings(majorMultiplier, 0, false);
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
              <Ionicons name="flash-outline" size={24} color={theme.primary} />
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

        {/* How scoring works */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '15' }]}>
              <Ionicons name="analytics-outline" size={24} color="#10B981" />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>How Scores Work</Text>
              <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
                Simple and transparent
              </Text>
            </View>
          </View>
          {[
            { icon: 'layers-outline', color: theme.primary, label: 'Points add up', desc: 'Every logged action adds or subtracts points from a baseline of 100. Major events hit harder.' },
            { icon: 'shield-checkmark-outline', color: '#10B981', label: 'Capped 0–100', desc: 'Scores never go below 0 or above 100, so they\'re always easy to read at a glance.' },
          ].map((item, i) => (
            <View key={i} style={[styles.scoringRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
              <View style={[styles.scoringIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scoringLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.scoringDesc, { color: theme.textMuted }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
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
    fontFamily: 'Poppins_700Bold',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  valueDisplay: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  valueText: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
  },
  valueLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  optionSublabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
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
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  scoringIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  scoringDesc: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_700Bold',
  },
});