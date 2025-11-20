import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { getSettings } from '../database/db';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = React.useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      const settingsData = getSettings();
      setSettings(settingsData);
    }, [])
  );

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all people, incidents, and custom categories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming soon', 'Delete functionality will be added');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scoring</Text>
        
        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => (navigation as any).navigate('Settings', { screen: 'CategoryWeights' })}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Category Weights</Text>
            <Text style={styles.settingSubtitle}>Adjust point values for each category</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('Settings', { screen: 'GlobalSettings' })}
          >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Major Incident Multiplier</Text>
            <Text style={styles.settingSubtitle}>Currently {settings?.major_multiplier || 3}x</Text>
          </View>
          <Text style={styles.settingValue}>{settings?.major_multiplier || 3}x</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => (navigation as any).navigate('Settings', { screen: 'GlobalSettings' })}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Time Decay</Text>
            <Text style={styles.settingSubtitle}>Old incidents count less</Text>
          </View>
          <Text style={styles.settingValue}>
            {settings?.time_decay_months === 0 ? 'Off' : `${settings?.time_decay_months || 6} months`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => (navigation as any).navigate('Settings', { screen: 'GlobalSettings' })}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Recency Boost</Text>
            <Text style={styles.settingSubtitle}>Recent incidents count 1.5x</Text>
          </View>
          <Text style={styles.settingValue}>{settings?.recency_boost_enabled ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        
        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => Alert.alert('Coming soon', 'Manage custom categories')}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Manage Custom Categories</Text>
            <Text style={styles.settingSubtitle}>Add, edit, or delete custom categories</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        
        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => Alert.alert('Coming soon', 'Export feature')}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Export Data</Text>
            <Text style={styles.settingSubtitle}>Download your data as JSON</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingRow, styles.dangerRow]}
          onPress={handleDeleteAllData}
        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, styles.dangerText]}>Delete All Data</Text>
            <Text style={styles.settingSubtitle}>Permanently erase everything</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Made with</Text>
          <Text style={styles.aboutValue}>❤️</Text>
        </View>
      </View>
    </ScrollView>
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
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  settingArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#F44336',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  aboutLabel: {
    fontSize: 16,
    color: '#333',
  },
  aboutValue: {
    fontSize: 16,
    color: '#666',
  },
});