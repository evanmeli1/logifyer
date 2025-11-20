import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { getSettings, updateSettings } from '../database/db';

export default function GlobalSettingsScreen() {
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
    Alert.alert('Success', 'Settings saved!');
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Major Incident Multiplier</Text>
          <Text style={styles.description}>
            How much more major incidents count compared to normal ones
          </Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.valueText}>{majorMultiplier}x</Text>
            <Slider
              style={styles.slider}
              minimumValue={2}
              maximumValue={5}
              step={1}
              value={majorMultiplier}
              onValueChange={setMajorMultiplier}
              minimumTrackTintColor="#2196F3"
              maximumTrackTintColor="#ddd"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>2x</Text>
              <Text style={styles.sliderLabel}>5x</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Decay</Text>
          <Text style={styles.description}>
            Old incidents count less over time
          </Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.optionButton, timeDecayMonths === 0 && styles.optionButtonSelected]}
              onPress={() => setTimeDecayMonths(0)}
            >
              <Text style={[styles.optionText, timeDecayMonths === 0 && styles.optionTextSelected]}>
                No Decay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, timeDecayMonths === 6 && styles.optionButtonSelected]}
              onPress={() => setTimeDecayMonths(6)}
            >
              <Text style={[styles.optionText, timeDecayMonths === 6 && styles.optionTextSelected]}>
                6 Months
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, timeDecayMonths === 12 && styles.optionButtonSelected]}
              onPress={() => setTimeDecayMonths(12)}
            >
              <Text style={[styles.optionText, timeDecayMonths === 12 && styles.optionTextSelected]}>
                12 Months
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recency Boost</Text>
          <Text style={styles.description}>
            Recent incidents (last 30 days) count 1.5x more
          </Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setRecencyBoostEnabled(!recencyBoostEnabled)}
          >
            <Text style={styles.toggleText}>Enable Recency Boost</Text>
            <View style={[styles.toggle, recencyBoostEnabled && styles.toggleActive]}>
              <View style={[styles.toggleThumb, recencyBoostEnabled && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sliderContainer: {
    paddingVertical: 8,
  },
  valueText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2196F3',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});