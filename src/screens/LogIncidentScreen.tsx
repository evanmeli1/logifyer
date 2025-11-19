import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAllPeople, getAllCategories, logIncident } from '../database/db';
import { Person, Category } from '../types';

export default function LogIncidentScreen({ route }: any) {
  const navigation = useNavigation();
  const preSelectedPersonId = route.params?.personId;

  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(preSelectedPersonId || null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isMajor, setIsMajor] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const peopleData = getAllPeople() as Person[];
    const categoriesData = getAllCategories() as Category[];
    setPeople(peopleData);
    setCategories(categoriesData);
  }, []);

  const handleSave = () => {
    if (!selectedPersonId) {
      Alert.alert('Error', 'Please select a person');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      logIncident(
        selectedPersonId,
        selectedCategory.id,
        selectedCategory.default_points,
        isMajor,
        note.trim() || undefined
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to log incident');
      console.error(error);
    }
  };

  const selectedPerson = people.find(p => p.id === selectedPersonId);
  const negativeCategories = categories.filter(c => c.is_positive === 0);
  const positiveCategories = categories.filter(c => c.is_positive === 1);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Person *</Text>
        {preSelectedPersonId ? (
          <View style={styles.selectedPersonCard}>
            <Text style={styles.selectedPersonName}>{selectedPerson?.name}</Text>
            <Text style={styles.selectedPersonType}>{selectedPerson?.relationship_type}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.peopleScroll}>
            {people.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={[
                  styles.personChip,
                  selectedPersonId === person.id && styles.personChipSelected,
                ]}
                onPress={() => setSelectedPersonId(person.id)}
              >
                <Text style={[
                  styles.personChipText,
                  selectedPersonId === person.id && styles.personChipTextSelected,
                ]}>
                  {person.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Negative Categories</Text>
        <View style={styles.categoryGrid}>
          {negativeCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory?.id === cat.id && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryPoints}>{cat.default_points}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Positive Categories</Text>
        <View style={styles.categoryGrid}>
          {positiveCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                styles.categoryButtonPositive,
                selectedCategory?.id === cat.id && styles.categoryButtonSelectedPositive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryPoints}>+{cat.default_points}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedCategory && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.majorToggle}
            onPress={() => setIsMajor(!isMajor)}
          >
            <View style={styles.checkbox}>
              {isMajor && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.majorToggleText}>
              <Text style={styles.majorToggleTitle}>Major incident (3x points)</Text>
              <Text style={styles.majorToggleSubtitle}>
                {isMajor 
                  ? `Will count as ${selectedCategory.default_points * 3} points`
                  : `Currently ${selectedCategory.default_points} points`
                }
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Add details..."
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Log Incident</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  selectedPersonCard: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  selectedPersonName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedPersonType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  peopleScroll: {
    flexDirection: 'row',
  },
  personChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    marginRight: 8,
  },
  personChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  personChipText: {
    fontSize: 14,
    color: '#666',
  },
  personChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  categoryButtonPositive: {
    borderColor: '#ddd',
  },
  categoryButtonSelected: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  categoryButtonSelectedPositive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F5FFF5',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  majorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
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
  majorToggleText: {
    flex: 1,
  },
  majorToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  majorToggleSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});