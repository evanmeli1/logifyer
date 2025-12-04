import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllCategories, deleteCategory, addCustomCategory } from '../database/db';
import { Category } from '../types';
import { useTheme } from '../theme';
import { checkSubscription } from '../services/purchases';

export default function ManageCategoriesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const loadCategories = async () => {
    const categoriesData = getAllCategories() as Category[];
    setCategories(categoriesData);
    
    // Check premium status
    try {
      const premium = await checkSubscription();
      setIsPremium(premium);
    } catch (e) {
      setIsPremium(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [])
  );

  const customCategories = categories.filter(c => c.is_custom === 1);
  const defaultCategories = categories.filter(c => c.is_custom === 0);
  
  // Separate by type
  const customNegative = customCategories.filter(c => c.is_positive === 0);
  const customPositive = customCategories.filter(c => c.is_positive === 1);
  const defaultNegative = defaultCategories.filter(c => c.is_positive === 0);
  const defaultPositive = defaultCategories.filter(c => c.is_positive === 1);
  
  const customCount = customCategories.length;
  const maxCustom = isPremium ? 10 : 3;
  const canAddMore = customCount < maxCustom;
  const slotsRemaining = maxCustom - customCount;

  const handleDelete = (categoryId: number, categoryName: string) => {
    Alert.alert(
      'Delete Category',
      `Delete "${categoryName}"? This will also delete all incidents using this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCategory(categoryId);
            loadCategories();
          },
        },
      ]
    );
  };

  const renderCategoryItem = (item: Category, isCustom: boolean) => {
    const isPositive = item.is_positive === 1;
    const color = isPositive ? '#10B981' : '#EF4444';

    return (
      <View 
        key={item.id} 
        style={[styles.categoryCard, { backgroundColor: theme.card }]}
      >
        <View style={[styles.emojiContainer, { backgroundColor: color + '12' }]}>
          <Text style={styles.categoryEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.categoryPoints, { color }]}>
            {isPositive ? '+' : ''}{item.default_points} points
          </Text>
        </View>
        {isCustom ? (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#EF444410' }]}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.defaultBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.defaultBadgeText, { color: theme.textMuted }]}>Default</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (title: string, items: Category[], isCustom: boolean, color: string) => {
    if (items.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: color }]} />
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
          <Text style={[styles.sectionCount, { color: theme.textMuted }]}>({items.length})</Text>
        </View>
        {items.map(item => renderCategoryItem(item, isCustom))}
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
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Usage Card */}
        <View style={[styles.usageCard, { backgroundColor: theme.card }]}>
          <View style={styles.usageTop}>
            <View style={styles.usageInfo}>
              <Text style={[styles.usageTitle, { color: theme.text }]}>Custom Categories</Text>
              <Text style={[styles.usageSubtitle, { color: theme.textMuted }]}>
                {canAddMore 
                  ? `${slotsRemaining} slot${slotsRemaining !== 1 ? 's' : ''} remaining` 
                  : 'Limit reached'}
              </Text>
            </View>
            {isPremium ? (
              <View style={[styles.proBadge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.proBadgeText, { color: theme.primary }]}>PRO</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
                onPress={() => (navigation as any).navigate('Paywall')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: theme.divider }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: customCount >= maxCustom ? '#EF4444' : theme.primary,
                    width: `${(customCount / maxCustom) * 100}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textMuted }]}>
              {customCount}/{maxCustom}
            </Text>
          </View>
        </View>

        {/* Custom Categories */}
        {customCategories.length > 0 && (
          <View style={styles.categoryGroup}>
            <Text style={[styles.groupTitle, { color: theme.text }]}>Your Categories</Text>
            {renderSection('Negative', customNegative, true, '#EF4444')}
            {renderSection('Positive', customPositive, true, '#10B981')}
          </View>
        )}

        {/* Default Categories */}
        <View style={styles.categoryGroup}>
          <Text style={[styles.groupTitle, { color: theme.text }]}>Default Categories</Text>
          {renderSection('Negative', defaultNegative, false, '#EF4444')}
          {renderSection('Positive', defaultPositive, false, '#10B981')}
        </View>

        {/* Empty state for custom */}
        {customCategories.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '12' }]}>
              <Text style={styles.emptyIcon}>✨</Text>
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>No custom categories yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Tap + to create your own incident types
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, !canAddMore && styles.fabDisabled]}
        onPress={() => {
          if (canAddMore) {
            setIsAddModalVisible(true);
          } else {
            Alert.alert(
              'Limit Reached',
              isPremium 
                ? 'You\'ve reached the maximum of 10 custom categories.'
                : 'Free users can create up to 3 custom categories. Upgrade to Pro for 10!',
              isPremium 
                ? [{ text: 'OK' }]
                : [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => (navigation as any).navigate('Paywall') }
                  ]
            );
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={canAddMore ? [theme.primary, theme.primaryLight] : ['#9CA3AF', '#9CA3AF']}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <AddCategoryModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={() => {
          loadCategories();
          setIsAddModalVisible(false);
        }}
        theme={theme}
      />
    </View>
  );
}

function AddCategoryModal({ visible, onClose, onAdd, theme }: any) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [points, setPoints] = useState('5');
  const [isPositive, setIsPositive] = useState(false);

  const MAX_NAME_LENGTH = 30;
  const MAX_POINTS = 20;
  const MIN_POINTS = 1;

  const negativeEmojis = ['😡', '😤', '🤬', '😒', '🙄', '😠', '💔', '😢', '🚫', '⏰', '💸', '🤥'];
  const positiveEmojis = ['😊', '😄', '🥰', '❤️', '💪', '🎉', '✨', '🌟', '👍', '🙌', '✅', '👂'];

  const displayedEmojis = isPositive ? positiveEmojis : negativeEmojis;

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }
    if (!emoji) {
      Alert.alert('Error', 'Please select an emoji');
      return;
    }
    
    const pointsNum = Number(points);
    if (!points || isNaN(pointsNum)) {
      Alert.alert('Error', 'Please enter valid points');
      return;
    }
    if (pointsNum < MIN_POINTS || pointsNum > MAX_POINTS) {
      Alert.alert('Error', `Points must be between ${MIN_POINTS} and ${MAX_POINTS}`);
      return;
    }

    const pointsValue = isPositive ? Math.abs(pointsNum) : -Math.abs(pointsNum);
    addCustomCategory(trimmedName, emoji, pointsValue, isPositive);
    
    resetForm();
    onAdd();
  };

  const resetForm = () => {
    setName('');
    setEmoji('');
    setPoints('5');
    setIsPositive(false);
  };

  const resetAndClose = () => {
    resetForm();
    onClose();
  };

  const handlePointsChange = (text: string) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '') {
      setPoints('');
    } else {
      const num = parseInt(numericText, 10);
      if (num <= MAX_POINTS) {
        setPoints(numericText);
      }
    }
  };

  const isValid = name.trim().length >= 2 && emoji && points && Number(points) >= MIN_POINTS;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Category</Text>
            <TouchableOpacity onPress={resetAndClose} style={styles.modalCloseButton}>
              <Text style={[styles.modalClose, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Type Selection First */}
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>TYPE</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { borderColor: theme.divider, backgroundColor: theme.backgroundSecondary },
                  !isPositive && { borderColor: '#EF4444', backgroundColor: '#EF444412' }
                ]}
                onPress={() => { setIsPositive(false); setEmoji(''); }}
              >
                <Text style={styles.typeEmoji}>👎</Text>
                <Text style={[
                  styles.typeButtonText,
                  { color: theme.textMuted },
                  !isPositive && { color: '#EF4444', fontFamily: 'Inter_700Bold' }
                ]}>
                  Negative
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { borderColor: theme.divider, backgroundColor: theme.backgroundSecondary },
                  isPositive && { borderColor: '#10B981', backgroundColor: '#10B98112' }
                ]}
                onPress={() => { setIsPositive(true); setEmoji(''); }}
              >
                <Text style={styles.typeEmoji}>👍</Text>
                <Text style={[
                  styles.typeButtonText,
                  { color: theme.textMuted },
                  isPositive && { color: '#10B981', fontFamily: 'Inter_700Bold' }
                ]}>
                  Positive
                </Text>
              </TouchableOpacity>
            </View>

            {/* Emoji Selection */}
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>EMOJI</Text>
              {!emoji && <Text style={styles.requiredText}>Required</Text>}
            </View>
            <View style={styles.emojiGrid}>
              {displayedEmojis.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.emojiButton,
                    { borderColor: theme.divider, backgroundColor: theme.backgroundSecondary },
                    emoji === e && { 
                      borderColor: isPositive ? '#10B981' : '#EF4444', 
                      backgroundColor: (isPositive ? '#10B981' : '#EF4444') + '15' 
                    }
                  ]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name Input */}
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>NAME</Text>
              <Text style={[
                styles.charCount, 
                { color: name.length >= MAX_NAME_LENGTH - 5 ? '#EF4444' : theme.textMuted }
              ]}>
                {name.length}/{MAX_NAME_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                { 
                  borderColor: name.trim().length === 0 
                    ? theme.divider 
                    : name.trim().length < 2 
                      ? '#EF4444' 
                      : '#10B981',
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                }
              ]}
              placeholder="e.g., Interrupted me"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={(text) => setName(text.slice(0, MAX_NAME_LENGTH))}
              maxLength={MAX_NAME_LENGTH}
            />
            {name.trim().length === 1 && (
              <Text style={styles.errorText}>Name must be at least 2 characters</Text>
            )}

            {/* Points Input */}
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>POINTS</Text>
              <Text style={[styles.charCount, { color: theme.textMuted }]}>
                {MIN_POINTS}-{MAX_POINTS}
              </Text>
            </View>
            <View style={styles.pointsRow}>
              <TouchableOpacity
                style={[styles.pointsBtn, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  const current = Number(points) || MIN_POINTS;
                  if (current > MIN_POINTS) setPoints(String(current - 1));
                }}
              >
                <Text style={[styles.pointsBtnText, { color: theme.text }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.pointsInput,
                  { 
                    borderColor: theme.divider,
                    backgroundColor: theme.backgroundSecondary,
                    color: isPositive ? '#10B981' : '#EF4444',
                  }
                ]}
                keyboardType="numeric"
                value={points}
                onChangeText={handlePointsChange}
                textAlign="center"
                maxLength={2}
              />
              <TouchableOpacity
                style={[styles.pointsBtn, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  const current = Number(points) || 0;
                  if (current < MAX_POINTS) setPoints(String(current + 1));
                }}
              >
                <Text style={[styles.pointsBtnText, { color: theme.text }]}>+</Text>
              </TouchableOpacity>
              <View style={[
                styles.pointsPreview, 
                { backgroundColor: (isPositive ? '#10B981' : '#EF4444') + '12' }
              ]}>
                <Text style={[
                  styles.pointsPreviewText, 
                  { color: isPositive ? '#10B981' : '#EF4444' }
                ]}>
                  {isPositive ? '+' : '-'}{points || '0'} pts
                </Text>
              </View>
            </View>

            {/* Preview Card */}
            {name.trim() && emoji && (
              <View style={[styles.previewCard, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.previewLabel, { color: theme.textMuted }]}>PREVIEW</Text>
                <View style={styles.previewContent}>
                  <View style={[
                    styles.previewEmoji, 
                    { backgroundColor: (isPositive ? '#10B981' : '#EF4444') + '12' }
                  ]}>
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </View>
                  <View style={styles.previewInfo}>
                    <Text style={[styles.previewName, { color: theme.text }]}>{name.trim()}</Text>
                    <Text style={[
                      styles.previewPoints, 
                      { color: isPositive ? '#10B981' : '#EF4444' }
                    ]}>
                      {isPositive ? '+' : '-'}{points || '0'} points
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, { opacity: isValid ? 1 : 0.5 }]} 
              onPress={handleSave}
              disabled={!isValid}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveButtonText}>Create Category</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
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
    paddingBottom: 100,
  },
  usageCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  usageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  usageInfo: {
    flex: 1,
  },
  usageTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  usageSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    minWidth: 40,
  },
  categoryGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  categoryPoints: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginBottom: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fabDisabled: {
    shadowOpacity: 0.1,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    fontSize: 22,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  requiredText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#EF4444',
    marginTop: 6,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
  },
  emojiText: {
    fontSize: 24,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
  },
  typeEmoji: {
    fontSize: 22,
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsBtnText: {
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
  },
  pointsInput: {
    width: 70,
    height: 48,
    borderWidth: 2,
    borderRadius: 14,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  pointsPreview: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsPreviewText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  previewCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewEmoji: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  previewPoints: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});