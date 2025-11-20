import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { getAllCategories, updateCategoryWeight } from '../database/db';
import { Category } from '../types';
import { useNavigation } from '@react-navigation/native';

export default function CategoryWeightsScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [weights, setWeights] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    const categoriesData = getAllCategories() as Category[];
    setCategories(categoriesData);
    
    const initialWeights: { [key: number]: number } = {};
    categoriesData.forEach(cat => {
      initialWeights[cat.id] = cat.default_points;
    });
    setWeights(initialWeights);
  }, []);

  const updateWeight = (categoryId: number, value: number) => {
    setWeights(prev => ({ ...prev, [categoryId]: Math.round(value) }));
  };

  const resetToDefaults = () => {
    Alert.alert(
        'Reset to Defaults',
        'Reset all category weights to default values?',
        [
        { text: 'Cancel', style: 'cancel' },
        {
            text: 'Reset',
            onPress: () => {
            const defaultValues: any = {
                'Cancelled plans': -3,
                'Lied/deceived': -8,
                'Disrespected you': -8,
                'Always late': -1,
                'Borrowed money unpaid': -5,
                'Only reaches out needing something': -3,
                'Showed up when needed': 8,
                'Actually listened': 5,
                'Had your back': 8,
                'Supported you': 5,
            };
            
            const newWeights: { [key: number]: number } = {};
            categories.forEach(cat => {
                const defaultValue = defaultValues[cat.name] || cat.default_points;
                newWeights[cat.id] = defaultValue;
                updateCategoryWeight(cat.id, defaultValue);
            });
            setWeights(newWeights);
            Alert.alert('Success', 'Reset to default values!');
            },
        },
        ]
    );
    };

  const negativeCategories = categories.filter(c => c.is_positive === 0);
  const positiveCategories = categories.filter(c => c.is_positive === 1);

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Negative Categories</Text>
          {negativeCategories.map(cat => (
            <View key={cat.id} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryValue}>{weights[cat.id] || cat.default_points}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={-20}
                maximumValue={-1}
                step={1}
                value={weights[cat.id] || cat.default_points}
                onValueChange={(value) => updateWeight(cat.id, value)}
                minimumTrackTintColor="#F44336"
                maximumTrackTintColor="#ddd"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>-20</Text>
                <Text style={styles.sliderLabel}>-1</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Positive Categories</Text>
          {positiveCategories.map(cat => (
            <View key={cat.id} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryValue}>+{weights[cat.id] || cat.default_points}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={20}
                step={1}
                value={weights[cat.id] || cat.default_points}
                onValueChange={(value) => updateWeight(cat.id, value)}
                minimumTrackTintColor="#4CAF50"
                maximumTrackTintColor="#ddd"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>+1</Text>
                <Text style={styles.sliderLabel}>+20</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} 
            onPress={() => {
                Object.entries(weights).forEach(([categoryId, points]) => {
                    updateCategoryWeight(Number(categoryId), points);
                });
                Alert.alert('Success', 'Category weights updated!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
                }}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryRow: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    flex: 1,
  },
  categoryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});