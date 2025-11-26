import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAllPeople, getPersonScore } from '../database/db';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SQLite from 'expo-sqlite';
import { useTheme } from '../theme';
import { themeColors } from '../theme/themes';
import ThemeModal from '../components/ThemeModal';

export default function StatsScreen() {
  const navigation = useNavigation();
  const { theme, themeColor } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
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
    }, [])
  );

  const loadStats = () => {
    const people = getAllPeople() as any[];
    
    let allIncidents: any[] = [];
    people.forEach((person: any) => {
      const db = SQLite.openDatabaseSync('logifyer.db');
      const incidents = db.getAllSync(
        'SELECT * FROM incidents WHERE person_id = ?',
        [person.id]
      );
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
    const thisWeekPositive = thisWeekIncidents.filter((i: any) => i.impact > 0).length;
    const thisWeekNegative = thisWeekIncidents.filter((i: any) => i.impact < 0).length;
    
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scores.forEach((score: number) => {
      if (score >= 90) gradeDistribution.A++;
      else if (score >= 80) gradeDistribution.B++;
      else if (score >= 70) gradeDistribution.C++;
      else if (score >= 60) gradeDistribution.D++;
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

  const getHealthGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 80) return '#84CC16';
    if (score >= 70) return '#FBBF24';
    if (score >= 60) return '#F97316';
    return '#EF4444';
  };

  const getTrendInfo = () => {
    if (stats.thisWeekPositive > stats.thisWeekNegative) {
      return { text: '↗ Improving', color: '#059669', bg: '#ECFDF5' };
    } else if (stats.thisWeekNegative > stats.thisWeekPositive) {
      return { text: '↘ Declining', color: '#DC2626', bg: '#FEF2F2' };
    }
    return { text: '→ Stable', color: '#6B7280', bg: '#F3F4F6' };
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
                <Text style={[styles.activityIcon, { color: '#DC2626' }]}>✕</Text>
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
              const gradeColor = getHealthColor(grade === 'A' ? 95 : grade === 'B' ? 85 : grade === 'C' ? 75 : grade === 'D' ? 65 : 55);
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

        {/* AI Overview - LOCKED */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={[styles.card, { backgroundColor: theme.card }]}>
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
    color: '#059669',
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