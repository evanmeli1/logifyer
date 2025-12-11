import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAllPeople, getPersonScore, getIncidentsByPerson } from '../database/db';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { themeColors } from '../theme/themes';
import ThemeModal from '../components/ThemeModal';
import { useAuth } from '../contexts/AuthContext';
import { checkSubscription } from '../services/purchases';
import { generateOverviewInsights, AIOverviewResult } from '../services/ai';

export default function StatsScreen() {
  const navigation = useNavigation();
  const { theme, themeColor } = useTheme();
  const { user } = useAuth();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(true);
  const [aiOverview, setAiOverview] = useState<AIOverviewResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalIncidents: 0,
    avgScore: 0,
    thisWeekPositive: 0,
    thisWeekNegative: 0,
    gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
  });

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      checkPremiumStatus();
    }, [])
  );

  const checkPremiumStatus = async () => {
    setLoadingPremium(true);
    try {
      const premium = await checkSubscription();
      setIsPremium(premium);
    } catch (error) {
      console.log('Error checking premium:', error);
      setIsPremium(false);
    } finally {
      setLoadingPremium(false);
    }
  };

  const loadStats = () => {
    const people = getAllPeople() as any[];
    
    let allIncidents: any[] = [];
    people.forEach((person: any) => {
      const incidents = getIncidentsByPerson(person.id) as any[];
      allIncidents = [...allIncidents, ...incidents];
    });
    
    const totalPeople = people.length;
    const totalIncidents = allIncidents.length;
    
    const scores = people.map((p: any) => getPersonScore(p.id));
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const thisWeekIncidents = allIncidents.filter((i: any) => 
      new Date(i.timestamp).getTime() > oneWeekAgo
    );
    const thisWeekPositive = thisWeekIncidents.filter((i: any) => i.points > 0).length;
    const thisWeekNegative = thisWeekIncidents.filter((i: any) => i.points < 0).length;
    
    // Consistent thresholds: 80/60/40/20
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scores.forEach((score: number) => {
      if (score >= 80) gradeDistribution.A++;
      else if (score >= 60) gradeDistribution.B++;
      else if (score >= 40) gradeDistribution.C++;
      else if (score >= 20) gradeDistribution.D++;
      else gradeDistribution.F++;
    });
    
    setStats({
      totalPeople,
      totalIncidents,
      avgScore,
      thisWeekPositive,
      thisWeekNegative,
      gradeDistribution,
    });
  };

  // Consistent thresholds: 80/60/40/20
  const getHealthGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  };

  // Consistent colors with HomeScreen
  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#22C55E';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#F97316';
    return '#EF4444';
  };

  const getTrendInfo = () => {
    if (stats.thisWeekPositive > stats.thisWeekNegative) {
      return { text: '↗ Improving', color: '#10B981', bg: '#ECFDF5' };
    } else if (stats.thisWeekNegative > stats.thisWeekPositive) {
      return { text: '↘ Declining', color: '#EF4444', bg: '#FEF2F2' };
    }
    return { text: '→ Stable', color: '#6B7280', bg: '#F3F4F6' };
  };

  const handleGenerateOverview = async (forceRegenerate: boolean = false) => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to use AI Overview.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => (navigation as any).getParent()?.navigate('Settings', { screen: 'SignIn' })
          },
        ]
      );
      return;
    }

    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'AI Overview is a premium feature. Upgrade to unlock AI-powered insights across all your relationships.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => (navigation as any).navigate('Settings', { screen: 'Paywall' })
          },
        ]
      );
      return;
    }

    if (stats.totalPeople === 0) {
      Alert.alert('No Data', 'Add some people and log incidents first to generate an overview.');
      return;
    }

    if (stats.totalIncidents === 0) {
      Alert.alert('No Incidents', 'Log some incidents first to generate meaningful insights.');
      return;
    }

    setLoadingAI(true);
    try {
      const people = getAllPeople() as any[];
      
      // Build data for AI
      const peopleData = people.map((person: any) => {
        const incidents = getIncidentsByPerson(person.id);
        const score = getPersonScore(person.id);
        
        return {
          name: person.name,
          relationship_type: person.relationship_type,
          score,
          incidentCount: incidents.length,
          recentIncidents: incidents.slice(0, 10), // Last 10 incidents
        };
      });

      const overview = await generateOverviewInsights(peopleData, stats.totalIncidents, forceRegenerate);
      setAiOverview(overview);
    } catch (error) {
      console.error('AI Overview error:', error);
      Alert.alert('Error', 'Failed to generate overview. Please check your internet connection and try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const trend = getTrendInfo();
  const currentColorData = themeColors[themeColor as keyof typeof themeColors];

  return (
    <LinearGradient
      colors={[theme.background, theme.backgroundSecondary]}
      style={styles.container}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.headerText }]}>Stats</Text>
            <Text style={[styles.headerSubtitle, { color: theme.headerTextSecondary }]}>Your relationship overview</Text>
          </View>
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: theme.headerOverlay }]}
            onPress={() => (navigation as any).navigate('Settings', { screen: 'SettingsMain' })}
          >
            <View style={styles.settingsIconContainer}>
              <View style={[styles.settingsDot, { backgroundColor: theme.headerText }]} />
              <View style={[styles.settingsDot, { backgroundColor: theme.headerText }]} />
              <View style={[styles.settingsDot, { backgroundColor: theme.headerText }]} />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Stats */}
        <View style={styles.heroRow}>
          <Animated.View entering={FadeInDown.delay(0).duration(400)} style={[styles.heroCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.heroNumber, { color: theme.primary }]}>{stats.totalPeople}</Text>
            <Text style={[styles.heroLabel, { color: theme.textMuted }]}>People</Text>
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.heroCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.heroNumber, { color: theme.primary }]}>{stats.totalIncidents}</Text>
            <Text style={[styles.heroLabel, { color: theme.textMuted }]}>Incidents</Text>
          </Animated.View>
        </View>

        {/* Overall Health */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Overall Health</Text>
          <View style={styles.overallHealth}>
            <View style={[styles.gradeCircle, { borderColor: getHealthColor(stats.avgScore) + '30', backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.gradeLetter, { color: getHealthColor(stats.avgScore) }]}>
                {getHealthGrade(stats.avgScore)}
              </Text>
              <Text style={[styles.gradeScore, { color: theme.textMuted }]}>{stats.avgScore}</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: trend.bg }]}>
              <Text style={[styles.trendText, { color: trend.color }]}>{trend.text}</Text>
            </View>
          </View>
        </Animated.View>

        {/* This Week Activity */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>This Week</Text>
          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <View style={styles.activityIconWrapper}>
                <Text style={styles.activityIcon}>✓</Text>
              </View>
              <Text style={[styles.activityNumber, { color: theme.text }]}>{stats.thisWeekPositive}</Text>
              <Text style={[styles.activityLabel, { color: theme.textMuted }]}>Positive</Text>
            </View>
            <View style={[styles.activityDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.activityItem}>
              <View style={[styles.activityIconWrapper, styles.negativeIcon]}>
                <Text style={[styles.activityIcon, { color: '#EF4444' }]}>✕</Text>
              </View>
              <Text style={[styles.activityNumber, { color: theme.text }]}>{stats.thisWeekNegative}</Text>
              <Text style={[styles.activityLabel, { color: theme.textMuted }]}>Negative</Text>
            </View>
          </View>
        </Animated.View>

        {/* Health Distribution */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Health Distribution</Text>
          <View style={styles.distributionContainer}>
            {(['A', 'B', 'C', 'D', 'F'] as const).map(grade => {
              const count = stats.gradeDistribution[grade];
              const percentage = stats.totalPeople > 0 
                ? (count / stats.totalPeople) * 100 
                : 0;
              // Consistent colors: A=80+, B=60+, C=40+, D=20+, F=<20
              const gradeColor = getHealthColor(grade === 'A' ? 80 : grade === 'B' ? 60 : grade === 'C' ? 40 : grade === 'D' ? 20 : 0);
              return (
                <View key={grade} style={styles.distributionRow}>
                  <View style={[styles.gradeLabel, { backgroundColor: gradeColor + '20' }]}>
                    <Text style={[styles.distributionGrade, { color: gradeColor }]}>{grade}</Text>
                  </View>
                  <View style={[styles.distributionBarContainer, { backgroundColor: theme.backgroundSecondary }]}>
                    <View 
                      style={[
                        styles.distributionBar,
                        { width: `${percentage}%`, backgroundColor: gradeColor }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.distributionCount, { color: theme.textMuted }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* AI Overview */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
          {loadingPremium ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : isPremium ? (
            // Premium user - show AI Overview
            <View>
              <View style={styles.aiHeader}>
                <View style={styles.aiTitleRow}>
                  <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>🤖 AI Overview</Text>
                  <View style={[styles.proBadgeSmall, { backgroundColor: theme.primary }]}>
                    <Text style={styles.proBadgeSmallText}>PRO</Text>
                  </View>
                </View>
                {aiOverview && (
                  <Text style={[styles.cacheIndicator, { color: theme.textMuted }]}>
                    {aiOverview.isCached ? '📦 Cached' : '✨ Fresh'} • {aiOverview.generatedAt}
                  </Text>
                )}
              </View>

              {!aiOverview ? (
                <TouchableOpacity 
                  style={[styles.generateButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleGenerateOverview(false)}
                  disabled={loadingAI}
                  activeOpacity={0.8}
                >
                  {loadingAI ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate Overview</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.aiContent}>
                  {/* Summary */}
                  <View style={[styles.aiSection, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.aiSectionTitle, { color: theme.text }]}>Summary</Text>
                    <Text style={[styles.aiSectionText, { color: theme.textMuted }]}>{aiOverview.summary}</Text>
                  </View>

                  {/* Key Patterns */}
                  {aiOverview.keyPatterns && aiOverview.keyPatterns.length > 0 && (
                    <View style={[styles.aiSection, { backgroundColor: theme.backgroundSecondary }]}>
                      <Text style={[styles.aiSectionTitle, { color: theme.text }]}>Key Patterns</Text>
                      {aiOverview.keyPatterns.map((pattern, index) => (
                        <View key={index} style={styles.patternRow}>
                          <Text style={[styles.patternBullet, { color: theme.primary }]}>•</Text>
                          <Text style={[styles.patternText, { color: theme.textMuted }]}>{pattern}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Top Concern & Strength */}
                  <View style={styles.aiRow}>
                    {aiOverview.topConcern && (
                      <View style={[styles.aiMiniCard, { backgroundColor: '#FEF2F2', flex: 1 }]}>
                        <Text style={styles.aiMiniIcon}>⚠️</Text>
                        <Text style={[styles.aiMiniLabel, { color: '#EF4444' }]}>Top Concern</Text>
                        <Text style={[styles.aiMiniText, { color: '#7F1D1D' }]} numberOfLines={3}>{aiOverview.topConcern}</Text>
                      </View>
                    )}
                    {aiOverview.topStrength && (
                      <View style={[styles.aiMiniCard, { backgroundColor: '#ECFDF5', flex: 1 }]}>
                        <Text style={styles.aiMiniIcon}>💪</Text>
                        <Text style={[styles.aiMiniLabel, { color: '#10B981' }]}>Top Strength</Text>
                        <Text style={[styles.aiMiniText, { color: '#065F46' }]} numberOfLines={3}>{aiOverview.topStrength}</Text>
                      </View>
                    )}
                  </View>

                  {/* Recommendation */}
                  {aiOverview.recommendation && (
                    <View style={[styles.aiSection, { backgroundColor: theme.primary + '10', borderLeftWidth: 3, borderLeftColor: theme.primary }]}>
                      <Text style={[styles.aiSectionTitle, { color: theme.primary }]}>💡 Recommendation</Text>
                      <Text style={[styles.aiSectionText, { color: theme.text }]}>{aiOverview.recommendation}</Text>
                    </View>
                  )}

                  {/* Regenerate Button */}
                  <TouchableOpacity 
                    style={styles.regenerateButton}
                    onPress={() => handleGenerateOverview(true)}
                    disabled={loadingAI}
                  >
                    <Text style={[styles.regenerateButtonText, { color: theme.primary }]}>
                      {loadingAI ? 'Analyzing...' : '🔄 Regenerate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            // Free user - show locked state
            <TouchableOpacity 
              onPress={() => (navigation as any).navigate('Settings', { screen: 'Paywall' })}
              activeOpacity={0.7}
            >
              <View style={styles.lockedOverlay}>
                <View style={[styles.lockBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
                <Text style={[styles.lockedTitle, { color: theme.text }]}>AI Overview</Text>
                <Text style={[styles.lockedSubtitle, { color: theme.textMuted }]}>Patterns across all your relationships</Text>
                <View style={styles.upgradeButton}>
                  <LinearGradient
                    colors={[theme.primary, theme.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.upgradeGradient}
                  >
                    <Text style={styles.upgradeText}>Upgrade to Premium</Text>
                  </LinearGradient>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Theme Card */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowThemeModal(true)}>
            <View style={styles.themeCard}>
              <View style={styles.themeLeft}>
                <Text style={styles.themeIcon}>🎨</Text>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeTitle, { color: theme.text }]}>Personalize Theme</Text>
                  <Text style={[styles.themeSubtitle, { color: theme.textMuted }]}>Current: {currentColorData.name}</Text>
                </View>
              </View>
              <View style={styles.colorDots}>
                <LinearGradient
                  colors={[theme.primary, theme.primaryLight]}
                  style={[styles.colorDot, styles.colorDotActive]}
                />
                <Text style={[styles.themeArrow, { color: theme.textMuted }]}>→</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <ThemeModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onUpgrade={() => {
          setShowThemeModal(false);
          (navigation as any).navigate('Settings', { screen: 'Paywall' });
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  settingsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  heroCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroNumber: {
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  heroLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  overallHealth: {
    alignItems: 'center',
  },
  gradeCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  gradeLetter: {
    fontSize: 44,
    fontFamily: 'Inter_700Bold',
  },
  gradeScore: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginTop: -2,
  },
  trendBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
  },
  activityIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  negativeIcon: {
    backgroundColor: '#FEF2F2',
  },
  activityIcon: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#10B981',
  },
  activityNumber: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  activityDivider: {
    width: 1,
    height: 70,
    marginHorizontal: 16,
  },
  distributionContainer: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gradeLabel: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributionGrade: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  distributionBarContainer: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 5,
  },
  distributionCount: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    width: 24,
    textAlign: 'right',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  // AI Overview styles
  aiHeader: {
    marginBottom: 16,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeSmallText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  cacheIndicator: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  generateButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  aiContent: {
    gap: 12,
  },
  aiSection: {
    padding: 14,
    borderRadius: 12,
  },
  aiSectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  aiSectionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  patternBullet: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 20,
  },
  patternText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  aiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiMiniCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiMiniIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  aiMiniLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  aiMiniText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 16,
  },
  regenerateButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  regenerateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  // Locked state styles
  lockedOverlay: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockIcon: {
    fontSize: 22,
  },
  lockedTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  lockedSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 14,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIcon: {
    fontSize: 26,
  },
  themeInfo: {},
  themeTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  themeSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  colorDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  themeArrow: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
  },
});