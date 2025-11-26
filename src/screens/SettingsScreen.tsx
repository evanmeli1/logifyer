import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings } from '../database/db';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
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
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
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
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ACCOUNT</Text>
          {user ? (
            <>
              <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Email</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>{user.email}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.settingRow, styles.lastRow]}
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
                colors={[theme.primary, theme.primaryLight]}
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
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>PREMIUM</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, styles.premiumRow, styles.lastRow, { backgroundColor: theme.primary + '10' }]}
            onPress={() => (navigation as any).navigate('Paywall')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, styles.premiumText, { color: theme.primary }]}>⭐ Upgrade to Premium</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Unlock AI insights & unlimited categories</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.primary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Scoring Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>SCORING</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: theme.divider }]}
            onPress={() => (navigation as any).navigate('CategoryWeights')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Category Weights</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Adjust point values for each category</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: theme.divider }]}
            onPress={() => (navigation as any).navigate('GlobalSettings')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Major Incident Multiplier</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Currently {settings?.major_multiplier || 3}x</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textMuted }]}>{settings?.major_multiplier || 3}x</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: theme.divider }]}
            onPress={() => (navigation as any).navigate('GlobalSettings')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Time Decay</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Old incidents count less</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textMuted }]}>
              {settings?.time_decay_months === 0 ? 'Off' : `${settings?.time_decay_months || 6} months`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => (navigation as any).navigate('GlobalSettings')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Recency Boost</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Recent incidents count 1.5x</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textMuted }]}>
              {settings?.recency_boost_enabled ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CATEGORIES</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => (navigation as any).navigate('ManageCategories')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Manage Custom Categories</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Add, edit, or delete custom categories</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Data Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DATA</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: theme.divider }]}
            onPress={() => Alert.alert('Coming soon', 'Export feature')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Export Data</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Download your data as JSON</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, styles.lastRow]}
            onPress={handleDeleteAllData}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, styles.dangerText]}>Delete All Data</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Permanently erase everything</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: theme.card, marginBottom: 32 }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ABOUT</Text>
          <View style={[styles.aboutRow, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.aboutLabel, { color: theme.text }]}>App Version</Text>
            <Text style={[styles.aboutValue, { color: theme.textMuted }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, styles.lastRow]}>
            <Text style={[styles.aboutLabel, { color: theme.text }]}>Made with</Text>
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
    fontFamily: 'Inter_700Bold',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
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
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
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
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  settingValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  settingArrow: {
    fontSize: 22,
  },
  dangerText: {
    color: '#EF4444',
  },
  signInButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
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
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  aboutLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  aboutValue: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  premiumRow: {
    borderRadius: 0,
  },
  premiumText: {
    fontFamily: 'Inter_700Bold',
  },
});