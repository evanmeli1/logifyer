import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings } from '../database/db';
import { useAuth } from '../contexts/AuthContext';
import { checkSubscription } from '../services/purchases';
import { deleteAllData } from '../database/db';
import { themeColors } from '../theme/themes';
import ThemeModal from '../components/ThemeModal';
import { useTheme } from '../theme';


export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { theme, themeColor } = useTheme();
  const [settings, setSettings] = React.useState<any>(null);
  const [isPremium, setIsPremium] = React.useState(false);
  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const currentColorData = themeColors[themeColor as keyof typeof themeColors];

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      // Load settings with error handling
      try {
        const settingsData = getSettings();
        if (isMounted) {
          setSettings(settingsData || null);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        if (isMounted) {
          setSettings(null); // Ensure we have null on error, not undefined
        }
      }
      
      // Check premium status
      const checkPremium = async () => {
        try {
          const premium = await checkSubscription();
          if (isMounted) {
            setIsPremium(premium);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          if (isMounted) {
            setIsPremium(false); // Safe default on error
          }
        }
      };
      checkPremium();

      return () => {
        isMounted = false;
      };
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
            if (Platform.OS === 'ios') {
              // iOS - Use Alert.prompt for typed confirmation
              Alert.prompt(
                'Confirm Delete',
                'Type DELETE to confirm',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: (text?: string) => {
                      if (text === 'DELETE') {
                        try {
                          deleteAllData();
                          Alert.alert('Success', 'All data has been deleted');
                        } catch (error) {
                          console.error('Error deleting data:', error);
                          Alert.alert('Error', 'Failed to delete data. Please try again.');
                        }
                      } else {
                        Alert.alert('Error', 'You must type DELETE to confirm');
                      }
                    },
                  },
                ],
                'plain-text'
              );
            } else {
              // Android - Final confirmation without text input
              Alert.alert(
                'Are You Absolutely Sure?',
                'All your people, incidents, and custom categories will be permanently deleted. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Yes, Delete Everything',
                    style: 'destructive',
                    onPress: () => {
                      try {
                        deleteAllData();
                        Alert.alert('Success', 'All data has been deleted');
                      } catch (error) {
                        console.error('Error deleting data:', error);
                        Alert.alert('Error', 'Failed to delete data. Please try again.');
                      }
                    },
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  // Safe defaults for settings values
  const majorMultiplier = settings?.major_multiplier ?? 3;
  const timeDecayMonths = settings?.time_decay_months ?? 6;
  const recencyBoostEnabled = settings?.recency_boost_enabled ?? false;

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
                  <Text 
                    style={[styles.settingSubtitle, { color: theme.textMuted }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {user.email}
                  </Text>
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
          
          {isPremium ? (
            <View style={[styles.settingRow, styles.premiumRow, styles.lastRow, { backgroundColor: theme.primary + '10' }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, styles.premiumText, { color: theme.primary }]}>✨ Premium Active</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>You have access to all features</Text>
              </View>
              <View style={[styles.premiumBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.settingRow, styles.premiumRow, styles.lastRow, { backgroundColor: theme.primary + '10' }]}
              onPress={() => (navigation as any).navigate('Paywall')}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, styles.premiumText, { color: theme.primary }]}>⭐ Upgrade to Premium</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Unlock AI insights & custom categories</Text>
              </View>
              <Text style={[styles.settingArrow, { color: theme.primary }]}>›</Text>
            </TouchableOpacity>
          )}
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
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Currently {majorMultiplier}x</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textMuted }]}>{majorMultiplier}x</Text>
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
              {timeDecayMonths === 0 ? 'Off' : `${timeDecayMonths} months`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => (navigation as any).navigate('GlobalSettings')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Recency Boost</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Last 7 days count 1.5x more</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textMuted }]}>
              {recencyBoostEnabled ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CATEGORIES</Text>

            {/* Manage Categories */}
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: theme.divider }]}
              onPress={() => (navigation as any).navigate('ManageCategories')}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Manage Custom Categories
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>
                  Add, edit or delete custom categories
                </Text>
              </View>
              <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
            </TouchableOpacity>

            {/* Personalize Theme */}
            <TouchableOpacity
              style={[styles.settingRow, styles.lastRow]}
              onPress={() => setShowThemeModal(true)}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Personalize Theme
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>
                  Current: {currentColorData.name}
                </Text>
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

        {/* Legal & Support Section */}
        <View style={[styles.section, { backgroundColor: theme.card, marginBottom: 32 }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LEGAL & SUPPORT</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: theme.divider }]}
            onPress={() => (navigation as any).navigate('Legal', { tab: 'terms' })}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Terms of Service</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: theme.divider }]}
            onPress={() => (navigation as any).navigate('Legal', { tab: 'privacy' })}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Privacy Policy</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => (navigation as any).navigate('Legal', { tab: 'support' })}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Contact Support</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>Get help or send feedback</Text>
            </View>
            <Text style={[styles.settingArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ThemeModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onUpgrade={() => {
          setShowThemeModal(false);
          (navigation as any).navigate('Paywall');
        }}
      />
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
    fontFamily: 'Poppins_700Bold',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  settingValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_600SemiBold',
  },
  aboutValue: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  premiumRow: {
    borderRadius: 0,
  },
  premiumText: {
    fontFamily: 'Poppins_700Bold',
  },
  premiumBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
},
premiumBadgeText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontFamily: 'Poppins_700Bold',
  letterSpacing: 0.5,
},
});