import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllPeople, getAllCategories, logIncident, getSettings } from '../database/db';
import { Person, Category } from '../types';
import { useFocusEffect } from '@react-navigation/native';

export default function LogIncidentScreen({ route }: any) {
  const [majorMultiplier, setMajorMultiplier] = useState(3);
  const navigation = useNavigation();
  const preSelectedPersonId = route.params?.personId;

  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(preSelectedPersonId || null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isMajor, setIsMajor] = useState(false);
  const [note, setNote] = useState('');
  
  const loadData = () => {
    const peopleData = getAllPeople() as Person[];
    const categoriesData = getAllCategories() as Category[];
    const settingsData: any = getSettings();
    setPeople(peopleData);
    setCategories(categoriesData);
    setMajorMultiplier(settingsData?.major_multiplier || 3);
  };

  const resetForm = () => {
    if (!preSelectedPersonId) {
      setSelectedPersonId(null);
    }
    setSelectedCategory(null);
    setIsMajor(false);
    setNote('');
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      resetForm();
    }, [])
  );

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
      Alert.alert('Success', 'Incident logged successfully! 🎉', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to log incident');
      console.error(error);
    }
  };

  const selectedPerson = people.find(p => p.id === selectedPersonId);
  const negativeCategories = categories.filter(c => c.is_positive === 0);
  const positiveCategories = categories.filter(c => c.is_positive === 1);

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#F43F5E', '#FB7185']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Incident</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.label}>PERSON</Text>
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
          <Text style={styles.label}>NEGATIVE CATEGORIES</Text>
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
          <Text style={styles.label}>POSITIVE CATEGORIES</Text>
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
              <View style={[styles.checkbox, isMajor && styles.checkboxActive]}>
                {isMajor && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.majorToggleText}>
                <Text style={styles.majorToggleTitle}>Major incident ({majorMultiplier}x points)</Text>
                <Text style={styles.majorToggleSubtitle}>
                  {isMajor 
                    ? `Will count as ${selectedCategory.default_points * majorMultiplier} points`
                    : `Currently ${selectedCategory.default_points} points`
                  }
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>NOTE (OPTIONAL)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add details..."
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <LinearGradient
          colors={['#F43F5E', '#FB923C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveGradient}
        >
          <Text style={styles.saveButtonText}>Log Incident</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
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
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  selectedPersonCard: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  selectedPersonName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  selectedPersonType: {
    fontSize: 14,
    color: '#991B1B',
    marginTop: 4,
    fontWeight: '600',
  },
  peopleScroll: {
    flexDirection: 'row',
  },
  personChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  personChipSelected: {
    backgroundColor: '#F43F5E',
    borderColor: '#F43F5E',
  },
  personChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  personChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  categoryButtonPositive: {
    borderColor: '#E5E7EB',
  },
  categoryButtonSelected: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  categoryButtonSelectedPositive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
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
    color: '#111827',
  },
  categoryPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  majorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: '#F43F5E',
    backgroundColor: '#F43F5E',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  majorToggleText: {
    flex: 1,
  },
  majorToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#111827',
    letterSpacing: -0.2,
  },
  majorToggleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },

  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});