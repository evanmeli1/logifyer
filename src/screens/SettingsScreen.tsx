import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings } from '../database/db';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = React.useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      const settingsData = getSettings();
      setSettings(settingsData);
    }, [])
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

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
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#F43F5E', '#FB7185']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>↓</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          {user ? (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Email</Text>
                  <Text style={styles.settingSubtitle}>{user.email}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.settingRow, styles.dangerRow]}
                onPress={handleSignOut}
              >
                <Text style={[styles.settingTitle, styles.dangerText]}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => (navigation as any).navigate('SignIn')}
            >
              <LinearGradient
                colors={['#F43F5E', '#FB923C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}
              >
                <Text style={styles.signInButtonText}>Sign In to Sync</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREMIUM</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, styles.premiumRow]}
            onPress={() => (navigation as any).navigate('Paywall')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, styles.premiumText]}>⭐ Upgrade to Premium</Text>
              <Text style={styles.settingSubtitle}>Unlock AI insights & unlimited categories</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCORING</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('CategoryWeights')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Category Weights</Text>
              <Text style={styles.settingSubtitle}>Adjust point values for each category</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('GlobalSettings')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Major Incident Multiplier</Text>
              <Text style={styles.settingSubtitle}>Currently {settings?.major_multiplier || 3}x</Text>
            </View>
            <Text style={styles.settingValue}>{settings?.major_multiplier || 3}x</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('GlobalSettings')}
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
            onPress={() => (navigation as any).navigate('GlobalSettings')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Recency Boost</Text>
              <Text style={styles.settingSubtitle}>Recent incidents count 1.5x</Text>
            </View>
            <Text style={styles.settingValue}>{settings?.recency_boost_enabled ? 'On' : 'Off'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('ManageCategories')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Manage Custom Categories</Text>
              <Text style={styles.settingSubtitle}>Add, edit, or delete custom categories</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA</Text>
          
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
          <Text style={styles.sectionTitle}>ABOUT</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingValue: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  settingArrow: {
    fontSize: 22,
    color: '#D1D5DB',
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#EF4444',
  },
  signInButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  signInGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aboutLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  aboutValue: {
    fontSize: 16,
    color: '#6B7280',
  },
  premiumRow: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  premiumText: {
    color: '#F43F5E',
    fontWeight: '700',
  },
});