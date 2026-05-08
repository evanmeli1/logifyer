import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllCategories, updateCategoryWeight } from '../database/db';
import { Category } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Memoized component - prevents re-render unless props change
const CategoryItem = React.memo(({ 
  cat, 
  isPositive, 
  value, 
  onUpdate, 
  theme 
}: { 
  cat: Category; 
  isPositive: boolean; 
  value: number;
  onUpdate: (id: number, val: number) => void;
  theme: any;
}) => {
  const color = isPositive ? '#10B981' : '#EF4444';
  
  return (
    <View style={[styles.categoryCard, { backgroundColor: theme.card }]}>
      <View style={styles.categoryHeader}>
        <View style={[styles.emojiContainer, { backgroundColor: color + '12' }]}>
          <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
            {cat.name}
          </Text>
          {cat.is_custom === 1 && (
            <View style={[styles.customBadge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.customBadgeText, { color: theme.primary }]}>Custom</Text>
            </View>
          )}
        </View>
        <View style={[styles.valueContainer, { backgroundColor: color + '12' }]}>
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
          onSlidingComplete={(val) => onUpdate(cat.id, val)}
          minimumTrackTintColor={color}
          maximumTrackTintColor={theme.divider}
          thumbTintColor={color}
        />
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>
            {isPositive ? 'Low' : 'Severe'}
          </Text>
          <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>
            {isPositive ? 'High' : 'Minor'}
          </Text>
        </View>
      </View>
    </View>
  );
});

export default function CategoryWeightsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [weights, setWeights] = useState<{ [key: number]: number }>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const categoriesData = getAllCategories() as Category[];
    setCategories(categoriesData);
    
    const initialWeights: { [key: number]: number } = {};
    categoriesData.forEach(cat => {
      initialWeights[cat.id] = cat.default_points;
    });
    setWeights(initialWeights);
  }, []);

  const updateWeight = useCallback((categoryId: number, value: number) => {
    setWeights(prev => ({ ...prev, [categoryId]: Math.round(value) }));
    setHasChanges(true);
  }, []);

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Reset all category weights to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
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
            setHasChanges(false);
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
    setHasChanges(false);
    Alert.alert('Success', 'Category weights updated!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const negativeCategories = categories.filter(c => c.is_positive === 0);
  const positiveCategories = categories.filter(c => c.is_positive === 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header - matching other screens */}
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Category Weights</Text>
          <Text style={styles.headerSubtitle}>Customize point values</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Info Card */}
      <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
        <View style={[styles.infoIcon, { backgroundColor: theme.primary + '12' }]}>
          <Ionicons name="bulb-outline" size={22} color={theme.primary} />
        </View>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          Adjust how much each action affects  scores. Higher values = bigger impact.
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Negative Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Negative Actions</Text>
            <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
              {negativeCategories.length}
            </Text>
          </View>
          
          {negativeCategories.map(cat => (
            <CategoryItem 
              key={cat.id} 
              cat={cat} 
              isPositive={false}
              value={weights[cat.id] || cat.default_points}
              onUpdate={updateWeight}
              theme={theme}
            />
          ))}
        </View>

        {/* Positive Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Positive Actions</Text>
            <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
              {positiveCategories.length}
            </Text>
          </View>
          
          {positiveCategories.map(cat => (
            <CategoryItem 
              key={cat.id} 
              cat={cat} 
              isPositive={true}
              value={weights[cat.id] || cat.default_points}
              onUpdate={updateWeight}
              theme={theme}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
        <TouchableOpacity 
          style={[styles.resetButton, { borderColor: theme.divider }]} 
          onPress={resetToDefaults}
        >
          <Text style={[styles.resetButtonText, { color: theme.textMuted }]}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, { opacity: hasChanges ? 1 : 0.5 }]} 
          onPress={handleSave}
          disabled={!hasChanges}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>Save</Text>
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
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconText: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
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
    marginBottom: 14,
  },
  emojiContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  customBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
  },
  valueContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 54,
    alignItems: 'center',
  },
  categoryValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  sliderContainer: {
    marginTop: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -6,
  },
  sliderLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 36,
    gap: 12,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  saveButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    
  },
  saveGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});