import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getPersonById, getIncidentsByPerson, getPersonScore, deleteIncident } from '../database/db';
import { Person } from '../types';

export default function PersonDetailScreen({ route }: any) {
  const { personId } = route.params;
  const navigation = useNavigation();
  const [person, setPerson] = useState<Person | null>(null);
  const [score, setScore] = useState(0);
  const [incidents, setIncidents] = useState<any[]>([]);

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

  const getHealthGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: '#4CAF50' };
    if (score >= 50) return { grade: 'B', color: '#8BC34A' };
    if (score >= 0) return { grade: 'C', color: '#FFC107' };
    if (score >= -49) return { grade: 'D', color: '#FF9800' };
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

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderIncident = ({ item }: any) => {
    const isMajor = item.is_major === 1;
    const isPositive = item.points > 0;

    return (
      <TouchableOpacity
        style={styles.incidentCard}
        onLongPress={() => handleDeleteIncident(item.id)}
      >
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
      </View>

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

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => (navigation as any).navigate('Home', { 
         screen: 'LogIncident', 
         params: { personId } 
        })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
});