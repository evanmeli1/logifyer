// src/screens/LegalScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

type TabType = 'terms' | 'privacy' | 'support';

export default function LegalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { tab } = (route.params as { tab?: TabType }) || {};
  const [activeTab, setActiveTab] = useState<TabType>(tab || 'terms');

  const termsContent = [
    {
      title: 'Acceptance of Terms',
      content: 'By downloading, installing, or using Logifyer, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.',
    },
    {
      title: 'Description of Service',
      content: 'Logifyer is a relationship tracking application that allows users to log incidents, track relationship health scores, and gain insights into their personal relationships. The app offers both free and premium subscription features.',
    },
    {
      title: 'User Accounts',
      content: 'You may use Logifyer without an account for local-only data storage. Creating an account enables cloud sync and backup features. You are responsible for maintaining the confidentiality of your account credentials.',
    },
    {
      title: 'Premium Subscription',
      content: 'Logifyer offers premium features through auto-renewable subscriptions. Payment will be charged to your Apple ID or Google Play account. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.',
    },
    {
      title: 'User Content',
      content: 'You retain ownership of all data and content you create within Logifyer. We do not sell or share your personal relationship data with third parties.',
    },
    {
      title: 'Disclaimer',
      content: 'Logifyer is provided "as is" without warranties of any kind. The relationship insights provided are for informational purposes only and should not be considered professional advice.',
    },
  ];

  const privacyContent = [
    {
      title: 'Information We Collect',
      content: 'We collect information you provide directly: account information (email, name), relationship data (people, incidents, notes), and usage data to improve our services.',
    },
    {
      title: 'Data Storage & Security',
      content: 'Your data is stored locally on your device by default. Cloud sync data is encrypted and stored securely on our servers. We implement industry-standard security measures.',
    },
    {
      title: 'AI Features',
      content: 'Our AI insights feature processes your relationship data to provide personalized advice. This processing occurs securely and your data is not used to train AI models.',
    },
    {
      title: 'Data Sharing',
      content: 'We do not sell your personal data. We only share information with service providers who help operate the app, and law enforcement when legally required.',
    },
    {
      title: 'Your Rights',
      content: 'You have the right to access, export, and delete your personal data at any time. You can also opt out of AI data processing and withdraw consent for data collection.',
    },
    {
      title: 'Data Retention',
      content: 'We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days.',
    },
  ];

  const handleEmail = () => {
    Linking.openURL('mailto:support@logifyer.com');
  };

  const renderContent = () => {
    if (activeTab === 'support') {
      return (
        <Animated.View entering={FadeInDown.duration(400)}>
          {/* Contact Card */}
          <View style={[styles.contactCard, { backgroundColor: theme.card }]}>
            <View style={[styles.contactIcon, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.contactEmoji}>💬</Text>
            </View>
            <Text style={[styles.contactTitle, { color: theme.text }]}>Get in Touch</Text>
            <Text style={[styles.contactDescription, { color: theme.textMuted }]}>
              Have questions, feedback, or need help?{'\n'}We'd love to hear from you.
            </Text>
            
            <TouchableOpacity 
              style={styles.emailButton}
              onPress={handleEmail}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emailGradient}
              >
                <Text style={styles.emailIcon}>✉️</Text>
                <Text style={styles.emailText}>support@logifyer.com</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* FAQ Section */}
          <View style={[styles.faqSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.faqTitle, { color: theme.text }]}>Common Questions</Text>
            
            {[
              { q: 'How do I cancel my subscription?', a: 'Go to Settings > Manage Subscription, or manage it directly in your device\'s App Store settings.' },
              { q: 'Can I export my data?', a: 'Yes! Go to Settings > Data > Export Data to download all your information.' },
              { q: 'How do I delete my account?', a: 'Go to Settings > Account > Delete Account. This will permanently remove all your data.' },
              { q: 'Is my data backed up?', a: 'If you\'re signed in, your data syncs to the cloud automatically. Otherwise, it\'s stored locally on your device.' },
            ].map((faq, index) => (
              <View 
                key={index} 
                style={[
                  styles.faqItem,
                  index !== 3 && { borderBottomWidth: 1, borderBottomColor: theme.divider }
                ]}
              >
                <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.q}</Text>
                <Text style={[styles.faqAnswer, { color: theme.textMuted }]}>{faq.a}</Text>
              </View>
            ))}
          </View>

          {/* Response Time */}
          <View style={[styles.responseCard, { backgroundColor: theme.primary + '08' }]}>
            <Text style={styles.responseIcon}>⏱️</Text>
            <Text style={[styles.responseText, { color: theme.textMuted }]}>
              We typically respond within 24 hours
            </Text>
          </View>
        </Animated.View>
      );
    }

    const content = activeTab === 'terms' ? termsContent : privacyContent;
    const icon = activeTab === 'terms' ? '📜' : '🔒';
    const intro = activeTab === 'terms' 
      ? 'Please read these terms carefully before using Logifyer.'
      : 'Your privacy matters. Here\'s how we protect your data.';

    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        {/* Quick Summary for Privacy */}
        {activeTab === 'privacy' && (
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>Quick Summary</Text>
            <View style={styles.summaryList}>
              {[
                'Your data is stored locally by default',
                'Cloud sync is optional and encrypted',
                'We never sell your personal data',
                'You can delete your data anytime',
              ].map((item, index) => (
                <View key={index} style={styles.summaryItem}>
                  <View style={[styles.summaryCheck, { backgroundColor: '#10B981' + '20' }]}>
                    <Text style={styles.summaryCheckText}>✓</Text>
                  </View>
                  <Text style={[styles.summaryItemText, { color: theme.textMuted }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: theme.primary + '08' }]}>
          <Text style={styles.introIcon}>{icon}</Text>
          <Text style={[styles.introText, { color: theme.textMuted }]}>{intro}</Text>
        </View>

        {/* Sections */}
        {content.map((section, index) => (
          <View 
            key={index} 
            style={[styles.section, { backgroundColor: theme.card }]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNumber, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.sectionNumberText, { color: theme.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: theme.textMuted }]}>{section.content}</Text>
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Legal & Support</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        {[
          { id: 'terms' as TabType, label: 'Terms' },
          { id: 'privacy' as TabType, label: 'Privacy' },
          { id: 'support' as TabType, label: 'Support' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && { backgroundColor: theme.primary }
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? '#FFFFFF' : theme.textMuted }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            © 2025 Logifyer. All rights reserved.
          </Text>
          <Text style={[styles.footerSubtext, { color: theme.textMuted }]}>
            Last updated: December 2025
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop:30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 14,
    padding: 5,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 12,
    marginBottom: 16,
  },
  introIcon: {
    fontSize: 24,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 20,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 14,
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCheckText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
  },
  summaryItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  section: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionContent: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
  },
  contactCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactEmoji: {
    fontSize: 32,
  },
  contactTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emailButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  emailGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  emailIcon: {
    fontSize: 18,
  },
  emailText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  faqSection: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  faqTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 14,
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  responseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  responseIcon: {
    fontSize: 18,
  },
  responseText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 10,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
});