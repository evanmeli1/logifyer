import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getPersonById, getIncidentsByPerson, getPersonScore, deleteIncident, deletePerson, resetPersonScore } from '../database/db';
import { Person } from '../types';

export default function PersonDetailScreen({ route }: any) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);  
  const { personId } = route.params;
  const navigation = useNavigation();
  const [person, setPerson] = useState<Person | null>(null);
  const [score, setScore] = useState(0);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

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
      `Permanently delete ${person?.name} and all their incidents? Type DELETE to confirm.`,
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

  const getHealthGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: '#4CAF50' };
    if (score >= 60) return { grade: 'B', color: '#8BC34A' };
    if (score >= 40) return { grade: 'C', color: '#FFC107' };
    if (score >= 20) return { grade: 'D', color: '#FF9800' };
    return { grade: 'F', color: '#F44336' };
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
        style={[styles.incidentCard, isSelected && styles.incidentCardSelected]}
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
      >
        {selectionMode && (
          <View style={styles.checkbox}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <View style={styles.incidentContent}>
          <View style={styles.incidentHeader}>
            <View style={styles.incidentTitleRow}>
              <Text style={styles.incidentEmoji}>{item.category_emoji}</Text>
              <Text style={styles.incidentName}>{item.category_name}</Text>
              {isMajor && (
                <View style={styles.majorBadge}>
                  <Text style={styles.majorBadgeText}>MAJOR</Text>
                </View>
              )}
            </View>
            <Text style={[styles.incidentPoints, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
              {item.points > 0 ? '+' : ''}{item.points}
            </Text>
          </View>
          {item.note && <Text style={styles.incidentNote}>{item.note}</Text>}
          <Text style={styles.incidentTime}>{formatDate(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!person) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const health = getHealthGrade(score);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.personName}>{person.name}</Text>
          <Text style={styles.relationshipType}>{person.relationship_type}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: health.color }]}>{score}</Text>
          <View style={[styles.gradeBadge, { backgroundColor: health.color }]}>
            <Text style={styles.gradeText}>{health.grade}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSelectionMode(true); }}>
            <Text style={styles.menuItemText}>☑️ Select Multiple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleResetScore(); }}>
            <Text style={styles.menuItemText}>🔄 Reset Score</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleDelete(); }}>
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>🗑️ Delete Person</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{incidents.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            {incidents.filter(i => i.points < 0).length}
          </Text>
          <Text style={styles.statLabel}>Negative</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {incidents.filter(i => i.points > 0).length}
          </Text>
          <Text style={styles.statLabel}>Positive</Text>
        </View>
      </View>
      
      <View style={styles.patternsSection}>
        <Text style={styles.patternsTitle}>Patterns</Text>
        
        {incidents.length > 0 && (
          <>
            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Biggest Issue:</Text>
              <Text style={styles.patternValue}>
                {(() => {
                  const negativeIncidents = incidents.filter(i => i.points < 0);
                  if (negativeIncidents.length === 0) return 'None';
                  const counts: any = {};
                  negativeIncidents.forEach(i => {
                    counts[i.category_name] = (counts[i.category_name] || 0) + 1;
                  });
                  const biggest = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0];
                  return `${biggest[0]} (${biggest[1]}x)`;
                })()}
              </Text>
            </View>

            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Trend:</Text>
              <Text style={styles.patternValue}>
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

            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Last Interaction:</Text>
              <Text style={styles.patternValue}>
                {formatDate(incidents[0].timestamp)}
              </Text>
            </View>

            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Positive Rate:</Text>
              <Text style={styles.patternValue}>
                {Math.round((incidents.filter(i => i.points > 0).length / incidents.length) * 100)}%
              </Text>
            </View>
          </>
        )}
      </View>

      {incidents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>No incidents logged yet</Text>
          <Text style={styles.emptySubtext}>Start tracking interactions</Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          renderItem={renderIncident}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {selectionMode ? (
        <View style={styles.selectionToolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => {
              setSelectionMode(false);
              setSelectedIncidents([]);
            }}
          >
            <Text style={styles.toolbarButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selectedIncidents.length} selected</Text>
          <TouchableOpacity
            style={[styles.toolbarButton, styles.deleteButton]}
            onPress={handleBulkDelete}
            disabled={selectedIncidents.length === 0}
          >
            <Text style={[styles.toolbarButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => (navigation as any).navigate('Home', { 
            screen: 'LogIncident', 
            params: { personId } 
          })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  relationshipType: {
    fontSize: 16,
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'center',
    gap: 4,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  gradeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  incidentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  incidentCardSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  incidentContent: {
    flex: 1,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  incidentName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  majorBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  majorBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  incidentPoints: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  incidentNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  incidentTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '300',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  menu: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemDanger: {
    color: '#F44336',
  },
  patternsSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
  },
  patternsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patternLabel: {
    fontSize: 14,
    color: '#666',
  },
  patternValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  toolbarButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  toolbarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteButtonText: {
    color: 'white',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
  },
});