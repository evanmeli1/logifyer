import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllCategories, updateCategoryWeight } from '../database/db';
import { Category } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';

export default function CategoryWeightsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
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

  const handleSave = () => {
    Object.entries(weights).forEach(([categoryId, points]) => {
      updateCategoryWeight(Number(categoryId), points);
    });
    Alert.alert('Success', 'Category weights updated!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const negativeCategories = categories.filter(c => c.is_positive === 0);
  const positiveCategories = categories.filter(c => c.is_positive === 1);

  const CategoryItem = ({ cat, isPositive }: { cat: Category; isPositive: boolean }) => {
    const value = weights[cat.id] || cat.default_points;
    const color = isPositive ? '#10B981' : '#EF4444';
    
    return (
      <View style={[styles.categoryCard, { backgroundColor: theme.card }]}>
        <View style={styles.categoryHeader}>
          <View style={[styles.emojiContainer, { backgroundColor: color + '15' }]}>
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
            <Text style={[styles.categoryDescription, { color: theme.textMuted }]}>
              {isPositive ? 'Positive impact' : 'Negative impact'}
            </Text>
          </View>
          <View style={[styles.valueContainer, { backgroundColor: color + '15' }]}>
            <Text style={[styles.categoryValue, { color }]}>
              {isPositive ? '+' : ''}{value}
            </Text>
          </View>
        </View>
        
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={isPositive ? 1 : -20}
            maximumValue={isPositive ? 20 : -1}
            step={1}
            value={value}
            onValueChange={(val) => updateWeight(cat.id, val)}
            minimumTrackTintColor={color}
            maximumTrackTintColor={theme.divider}
            thumbTintColor={color}
          />
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>
              {isPositive ? '+1' : '-20'}
            </Text>
            <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>
              {isPositive ? '+20' : '-1'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category Weights</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Negative Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EF4444' + '15' }]}>
              <Text style={styles.sectionIconText}>👎</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Negative</Text>
            <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
              {negativeCategories.length} categories
            </Text>
          </View>
          
          {negativeCategories.map(cat => (
            <CategoryItem key={cat.id} cat={cat} isPositive={false} />
          ))}
        </View>

        {/* Positive Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#10B981' + '15' }]}>
              <Text style={styles.sectionIconText}>👍</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Positive</Text>
            <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
              {positiveCategories.length} categories
            </Text>
          </View>
          
          {positiveCategories.map(cat => (
            <CategoryItem key={cat.id} cat={cat} isPositive={true} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
        <TouchableOpacity 
          style={[styles.resetButton, { borderColor: theme.divider }]} 
          onPress={resetToDefaults}
        >
          <Text style={[styles.resetButtonText, { color: theme.textMuted }]}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
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
    fontFamily: 'Inter_700Bold',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIconText: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  categoryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  valueContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  sliderContainer: {
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
  },
  resetButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
});