import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPersonById, getIncidentsByPerson, getPersonScore, deleteIncident, deletePerson, resetPersonScore } from '../database/db';
import { Person } from '../types';
import { generatePersonInsights, AIInsightsResult } from '../services/ai';
import { useTheme } from '../theme';

export default function PersonDetailScreen({ route }: any) {
  const { theme } = useTheme();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);  
  const { personId } = route.params || {};
  const navigation = useNavigation();
  const [person, setPerson] = useState<Person | null>(null);
  const [score, setScore] = useState(0);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadData = useCallback(() => {
    const personData = getPersonById(personId) as Person;
    const incidentsData = getIncidentsByPerson(personId);
    const currentScore = getPersonScore(personId);
    
    setPerson(personData);
    setIncidents(incidentsData);
    setScore(currentScore);
  }, [personId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleResetScore = () => {
    Alert.alert(
      'Reset Score',
      `Delete all incidents for ${person?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetPersonScore(personId);
            loadData();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Permanently delete ${person?.name} and all their incidents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
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
                      deletePerson(personId);
                      navigation.goBack();
                    } else {
                      Alert.alert('Error', 'You must type DELETE to confirm');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const handleGenerateInsights = async (forceRegenerate: boolean = false) => {
    if (incidents.length === 0) {
      Alert.alert('No Data', 'Add some incidents first to generate insights.');
      return;
    }

    setLoadingInsights(true);
    try {
      const insights = await generatePersonInsights(
        personId,
        person!.name,
        incidents,
        score,
        forceRegenerate
      );
      setAiInsights(insights);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate insights. Check your API key and internet connection.');
      console.error(error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getHealthGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: '#10B981', bg: '#10B98115' };
    if (score >= 60) return { grade: 'B', color: '#22C55E', bg: '#22C55E15' };
    if (score >= 40) return { grade: 'C', color: '#F59E0B', bg: '#F59E0B15' };
    if (score >= 20) return { grade: 'D', color: '#F97316', bg: '#F9731615' };
    return { grade: 'F', color: '#EF4444', bg: '#EF444415' };
  };

  const handleDeleteIncident = (incidentId: number) => {
    Alert.alert(
      'Delete Incident',
      'Are you sure you want to delete this incident?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteIncident(incidentId);
            loadData();
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const toggleSelection = (incidentId: number) => {
    if (selectedIncidents.includes(incidentId)) {
      setSelectedIncidents(selectedIncidents.filter(id => id !== incidentId));
    } else {
      setSelectedIncidents([...selectedIncidents, incidentId]);
    }
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Incidents',
      `Delete ${selectedIncidents.length} incidents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedIncidents.forEach(id => deleteIncident(id));
            setSelectedIncidents([]);
            setSelectionMode(false);
            loadData();
          },
        },
      ]
    );
  };

  const renderIncident = ({ item }: any) => {
    const isMajor = item.is_major === 1;
    const isPositive = item.points > 0;
    const isSelected = selectedIncidents.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.incidentCard,
          { backgroundColor: theme.card },
          isSelected && { backgroundColor: theme.primary + '15', borderColor: theme.primary, borderWidth: 1.5 }
        ]}
        onPress={() => {
          if (selectionMode) {
            toggleSelection(item.id);
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            handleDeleteIncident(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        {selectionMode && (
          <View style={[
            styles.checkbox,
            { borderColor: theme.primary },
            isSelected && { backgroundColor: theme.primary }
          ]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <View style={styles.incidentContent}>
          <View style={styles.incidentHeader}>
            <View style={styles.incidentTitleRow}>
              <View style={[
                styles.emojiContainer,
                { backgroundColor: isPositive ? '#10B98112' : '#EF444412' }
              ]}>
                <Text style={styles.incidentEmoji}>{item.category_emoji}</Text>
              </View>
              <View style={styles.incidentInfo}>
                <Text style={[styles.incidentName, { color: theme.text }]}>{item.category_name}</Text>
                <Text style={[styles.incidentTime, { color: theme.textMuted }]}>{formatDate(item.timestamp)}</Text>
              </View>
            </View>
            <View style={styles.pointsContainer}>
              {isMajor && (
                <View style={[styles.majorBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.majorBadgeText}>MAJOR</Text>
                </View>
              )}
              <Text style={[styles.incidentPoints, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                {item.points > 0 ? '+' : ''}{item.points}
              </Text>
            </View>
          </View>
          {item.note && (
            <Text style={[styles.incidentNote, { color: theme.textMuted }]}>{item.note}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!person) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  const health = getHealthGrade(score);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.personName}>{person.name}</Text>
          <Text style={styles.relationshipType}>{person.relationship_type}</Text>
          
          {/* Score Display */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreMain}>
              <Text style={[styles.scoreNumber, { color: health.color }]}>{score}</Text>
              <View style={[styles.gradeBadge, { backgroundColor: health.color }]}>
                <Text style={styles.gradeText}>{health.grade}</Text>
              </View>
            </View>
            <Text style={styles.scoreLabel}>Relationship Score</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Dropdown Menu */}
      {menuVisible && (
        <View style={[styles.menu, { backgroundColor: theme.card }]}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.divider }]} 
            onPress={() => { setMenuVisible(false); setSelectionMode(true); }}
          >
            <Text style={[styles.menuItemText, { color: theme.text }]}>☑️  Select Multiple</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.divider }]} 
            onPress={() => { setMenuVisible(false); handleResetScore(); }}
          >
            <Text style={[styles.menuItemText, { color: theme.text }]}>🔄  Reset Score</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0 }]} 
            onPress={() => { setMenuVisible(false); handleDelete(); }}
          >
            <Text style={[styles.menuItemText, { color: '#EF4444' }]}>🗑️  Delete Person</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{incidents.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {incidents.filter(i => i.points < 0).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Negative</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {incidents.filter(i => i.points > 0).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Positive</Text>
        </View>
      </View>

      <FlatList
        data={incidents}
        renderItem={renderIncident}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Patterns Section */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Patterns</Text>
              
              {incidents.length > 0 ? (
                <View style={styles.patternsList}>
                  <View style={[styles.patternRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Biggest Issue</Text>
                    <Text style={[styles.patternValue, { color: theme.text }]}>
                      {(() => {
                        const negativeIncidents = incidents.filter(i => i.points < 0);
                        if (negativeIncidents.length === 0) return 'None 🎉';
                        const counts: any = {};
                        negativeIncidents.forEach(i => {
                          counts[i.category_name] = (counts[i.category_name] || 0) + 1;
                        });
                        const biggest = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0];
                        return `${biggest[0]} (${biggest[1]}x)`;
                      })()}
                    </Text>
                  </View>

                  <View style={[styles.patternRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Trend</Text>
                    <Text style={[styles.patternValue, { color: theme.text }]}>
                      {(() => {
                        if (incidents.length < 2) return '—';
                        const recent = incidents.slice(0, Math.ceil(incidents.length / 2));
                        const older = incidents.slice(Math.ceil(incidents.length / 2));
                        const recentAvg = recent.reduce((sum, i) => sum + i.points, 0) / recent.length;
                        const olderAvg = older.reduce((sum, i) => sum + i.points, 0) / older.length;
                        if (recentAvg > olderAvg + 2) return '📈 Improving';
                        if (recentAvg < olderAvg - 2) return '📉 Declining';
                        return '→ Stable';
                      })()}
                    </Text>
                  </View>

                  <View style={[styles.patternRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Last Interaction</Text>
                    <Text style={[styles.patternValue, { color: theme.text }]}>
                      {formatDate(incidents[0].timestamp)}
                    </Text>
                  </View>

                  <View style={[styles.patternRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Positive Rate</Text>
                    <Text style={[styles.patternValue, { color: '#10B981' }]}>
                      {Math.round((incidents.filter(i => i.points > 0).length / incidents.length) * 100)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.emptyPatterns, { color: theme.textMuted }]}>
                  Log some incidents to see patterns
                </Text>
              )}
            </View>

            {/* AI Insights Section */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>🤖 AI Insights</Text>
                <View style={[styles.premiumBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.premiumBadgeText, { color: theme.primary }]}>PRO</Text>
                </View>
              </View>
              
              {!aiInsights ? (
                <TouchableOpacity 
                  style={[styles.generateButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleGenerateInsights(false)}
                  disabled={loadingInsights}
                  activeOpacity={0.8}
                >
                  <Text style={styles.generateButtonText}>
                    {loadingInsights ? 'Analyzing...' : 'Generate Insights'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.insightsBox, { backgroundColor: theme.backgroundSecondary, borderLeftColor: theme.primary }]}>
                  <View style={styles.insightsHeader}>
                    <Text style={[styles.insightsTimestamp, { color: theme.textMuted }]}>
                      {aiInsights.isCached ? '📦 Cached' : '✨ Fresh'} • {aiInsights.generatedAt}
                    </Text>
                  </View>
                  <Text style={[styles.insightsText, { color: theme.text }]}>{aiInsights.content}</Text>
                  <TouchableOpacity 
                    style={styles.regenerateButton}
                    onPress={() => handleGenerateInsights(true)}
                    disabled={loadingInsights}
                  >
                    <Text style={[styles.regenerateButtonText, { color: theme.primary }]}>
                      {loadingInsights ? 'Analyzing...' : '🔄 Regenerate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Incidents Header */}
            {incidents.length > 0 && (
              <Text style={[styles.incidentsHeader, { color: theme.text }]}>
                Recent Activity
              </Text>
            )}
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>No incidents logged yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Tap + to start tracking interactions
            </Text>
          </View>
        )}
      />

      {/* Selection Toolbar */}
      {selectionMode ? (
        <View style={[styles.selectionToolbar, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => {
              setSelectionMode(false);
              setSelectedIncidents([]);
            }}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.selectedCount, { color: theme.text }]}>{selectedIncidents.length} selected</Text>
          <TouchableOpacity
            style={[styles.toolbarButton, styles.deleteButton]}
            onPress={handleBulkDelete}
            disabled={selectedIncidents.length === 0}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => (navigation as any).navigate('LogIncident', { personId: personId })}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 22,
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  personName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
    marginBottom: 4,
  },
  relationshipType: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreNumber: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  menu: {
    position: 'absolute',
    top: 100,
    right: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    minWidth: 180,
  },
  menuItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: -12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  patternsList: {},
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  patternLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  patternValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyPatterns: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 16,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
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
  insightsBox: {
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  insightsHeader: {
    marginBottom: 8,
  },
  insightsTimestamp: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  insightsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 12,
  },
  regenerateButton: {
    alignSelf: 'flex-start',
  },
  regenerateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  incidentsHeader: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    marginTop: 8,
  },
  incidentCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  incidentContent: {
    flex: 1,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentEmoji: {
    fontSize: 22,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  incidentTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  pointsContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  majorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  majorBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  incidentPoints: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  incidentNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  selectionToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  toolbarButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  toolbarButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  selectedCount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Inter_300Light',
  },
});