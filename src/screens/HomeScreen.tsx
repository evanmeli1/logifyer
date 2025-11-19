import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllPeople, getPersonScore } from '../database/db';
import { Person } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [people, setPeople] = useState<(Person & { score: number })[]>([]);

  const loadPeople = useCallback(() => {
    const peopleData = getAllPeople() as Person[];
    const peopleWithScores = peopleData.map(person => ({
      ...person,
      score: getPersonScore(person.id),
    }));
    peopleWithScores.sort((a, b) => b.score - a.score);
    setPeople(peopleWithScores);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPeople();
    }, [loadPeople])
  );

  const getHealthGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: '#4CAF50' };
    if (score >= 50) return { grade: 'B', color: '#8BC34A' };
    if (score >= 0) return { grade: 'C', color: '#FFC107' };
    if (score >= -49) return { grade: 'D', color: '#FF9800' };
    return { grade: 'F', color: '#F44336' };
  };

  const renderPerson = ({ item }: { item: Person & { score: number } }) => {
    const health = getHealthGrade(item.score);
    
    return (
      <TouchableOpacity 
        style={styles.personCard}
        onPress={() => Alert.alert('Coming soon', 'Person detail screen')}
      >
        <View style={styles.personInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.personName}>{item.name}</Text>
            <Text style={styles.relationshipType}>{item.relationship_type}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: health.color }]}>{item.score}</Text>
            <View style={[styles.gradeBadge, { backgroundColor: health.color }]}>
              <Text style={styles.gradeText}>{health.grade}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {people.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No people yet</Text>
          <Text style={styles.emptySubtitle}>Add your first person to start tracking</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => (navigation as any).navigate('Home', { screen: 'AddPerson' })}
          >
            <Text style={styles.addButtonText}>+ Add Person</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={people}
            renderItem={renderPerson}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
          <TouchableOpacity 
            style={styles.fab}
            onPress={() => (navigation as any).navigate('Home', { screen: 'AddPerson' })}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  personCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  personName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  relationshipType: {
    fontSize: 14,
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'center',
    gap: 4,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
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
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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