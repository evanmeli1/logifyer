import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllCategories, deleteCategory, addCustomCategory, updateCategoryWeight, getDatabase } from '../database/db';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { useTheme } from '../theme';
import { checkSubscription } from '../services/purchases';

export default function ManageCategoriesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoadingPremium, setIsLoadingPremium] = useState(true);

  const loadCategories = async () => {
    let isMounted = true;

    try {
      const categoriesData = getAllCategories() as Category[];
      if (isMounted) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      if (isMounted) {
        Alert.alert('Error', 'Failed to load categories. Please try again.');
      }
    }
    
    // Check premium status
    try {
      const premium = await checkSubscription();
      if (isMounted) {
        setIsPremium(premium);
        setIsLoadingPremium(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      if (isMounted) {
        setIsPremium(false);
        setIsLoadingPremium(false);
      }
    }

    return () => {
      isMounted = false;
    };
  };

  useFocusEffect(
    React.useCallback(() => {
      let cleanup: (() => void) | undefined;
      
      loadCategories().then(cleanupFn => {
        cleanup = cleanupFn;
      });

      return () => {
        if (cleanup) cleanup();
      };
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
    // Escape quotes in category name for display
    const escapedName = categoryName.replace(/"/g, '\\"');
    
    Alert.alert(
      'Delete Category',
      `Delete "${escapedName}"? Past logs using this category will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deleteCategory(categoryId);
              loadCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsEditModalVisible(true);
  };

  const renderCategoryItem = (item: Category, isCustom: boolean) => {
    const isPositive = item.is_positive === 1;
    const color = isPositive ? '#10B981' : '#EF4444';

    const CardContent = (
      <>
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
          <View style={[styles.editHint, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.editHintText, { color: theme.textMuted }]}>Tap to edit</Text>
          </View>
        ) : (
          <View style={[styles.defaultBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.defaultBadgeText, { color: theme.textMuted }]}>Default</Text>
          </View>
        )}
      </>
    );

    if (isCustom) {
      return (
        <TouchableOpacity 
          key={item.id} 
          style={[styles.categoryCard, { backgroundColor: theme.card }]}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          {CardContent}
        </TouchableOpacity>
      );
    }

    return (
      <View 
        key={item.id} 
        style={[styles.categoryCard, { backgroundColor: theme.card }]}
      >
        {CardContent}
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
            {isLoadingPremium ? (
              <View style={[styles.proBadge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.proBadgeText, { color: theme.primary }]}>...</Text>
              </View>
            ) : isPremium ? (
              <LinearGradient
                colors={['#F59E0B', '#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.proBadge}
              >
                <Text style={[styles.proBadgeText, { color: '#FFF' }]}>PRO</Text>
              </LinearGradient>
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
              <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
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
        onAdd={async () => {
          await loadCategories();
          setIsAddModalVisible(false);
        }}
        theme={theme}
        existingCategories={categories}
      />

      <EditCategoryModal
        visible={isEditModalVisible}
        category={editingCategory}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingCategory(null);
        }}
        onSave={async () => {
          await loadCategories();
          setIsEditModalVisible(false);
          setEditingCategory(null);
        }}
        onDelete={() => {
          if (editingCategory) {
            handleDelete(editingCategory.id, editingCategory.name);
          }
          setIsEditModalVisible(false);
          setEditingCategory(null);
        }}
        theme={theme}
        existingCategories={categories}
      />
    </View>
  );
}

function AddCategoryModal({ visible, onClose, onAdd, theme, existingCategories }: any) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [points, setPoints] = useState('5');
  const [isPositive, setIsPositive] = useState(false);

  const MAX_NAME_LENGTH = 30;
  const MAX_POINTS = 20;
  const MIN_POINTS = 1;

  const negativeEmojis = ['✕', '↓', '⊘', '≈', '$', '◁', '−', '⊗', '∅', '⊖', '≠', '◀'];
  const positiveEmojis = ['✓', '↑', '▲', '◎', '○', '◉', '⊕', '△', '+', '★', '♡', '◆'];

  const displayedEmojis = isPositive ? positiveEmojis : negativeEmojis;

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setName('');
      setEmoji('');
      setPoints('5');
      setIsPositive(false);
    }
  }, [visible]);

  const checkDuplicateName = (nameToCheck: string): boolean => {
    const trimmedName = nameToCheck.trim().toLowerCase();
    return existingCategories.some(
      (cat: Category) => cat.name.toLowerCase() === trimmedName
    );
  };

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
    if (checkDuplicateName(trimmedName)) {
      Alert.alert('Error', 'A category with this name already exists');
      return;
    }
    if (!emoji) {
      Alert.alert('Error', 'Please select an emoji');
      return;
    }
    
    const pointsNum = Number(points);
    if (!points || isNaN(pointsNum) || pointsNum === 0) {
      Alert.alert('Error', 'Please enter valid points');
      return;
    }
    if (pointsNum < MIN_POINTS || pointsNum > MAX_POINTS) {
      Alert.alert('Error', `Points must be between ${MIN_POINTS} and ${MAX_POINTS}`);
      return;
    }

    try {
      const pointsValue = isPositive ? Math.abs(pointsNum) : -Math.abs(pointsNum);
      addCustomCategory(trimmedName, emoji, pointsValue, isPositive);
      onAdd();
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create category. Please try again.');
    }
  };

  const handlePointsChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '') {
      setPoints('1'); // Default to MIN_POINTS instead of empty
    } else {
      const num = parseInt(numericText, 10);
      if (num <= MAX_POINTS) {
        setPoints(numericText);
      }
    }
  };

  const pointsValue = points ? Number(points) : MIN_POINTS;
  const isValid = name.trim().length >= 2 && emoji && pointsValue >= MIN_POINTS;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Category</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={[styles.modalClose, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                <Ionicons name="remove-circle-outline" size={26} color={!isPositive ? '#EF4444' : theme.textMuted} />
                <Text style={[
                  styles.typeButtonText,
                  { color: theme.textMuted },
                  !isPositive && { color: '#EF4444', fontFamily: 'Poppins_700Bold' }
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
                <Ionicons name="add-circle-outline" size={26} color={isPositive ? '#10B981' : theme.textMuted} />
                <Text style={[
                  styles.typeButtonText,
                  { color: theme.textMuted },
                  isPositive && { color: '#10B981', fontFamily: 'Poppins_700Bold' }
                ]}>
                  Positive
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>EMOJI</Text>
              {!emoji && <Text style={styles.requiredText}>Required</Text>}
            </View>
            <View style={styles.emojiInputRow}>
              <View style={[
                styles.emojiPreviewBox, 
                { 
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: emoji ? (isPositive ? '#10B981' : '#EF4444') : theme.divider,
                }
              ]}>
                <Text style={styles.emojiPreviewText}>{emoji || '?'}</Text>
              </View>
              <TextInput
                style={[
                  styles.emojiCustomInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.divider,
                    color: theme.text,
                  }
                ]}
                placeholder="Paste or type emoji"
                placeholderTextColor={theme.textMuted}
                value={emoji}
                onChangeText={(text) => {
                  // Match any emoji including multi-character sequences
                  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
                  const matches = text.match(emojiRegex);
                  if (matches && matches.length > 0) {
                    setEmoji(matches[0]); // Take first emoji
                  } else if (text === '') {
                    setEmoji('');
                  }
                }}
                maxLength={4}
              />
            </View>

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
                      : checkDuplicateName(name.trim())
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
            {name.trim().length >= 2 && checkDuplicateName(name.trim()) && (
              <Text style={styles.errorText}>A category with this name already exists</Text>
            )}

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
                  const current = pointsValue;
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
                keyboardType="number-pad"
                value={points}
                onChangeText={handlePointsChange}
                textAlign="center"
                maxLength={2}
              />
              <TouchableOpacity
                style={[styles.pointsBtn, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  const current = pointsValue;
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
                  {pointsValue > 0 ? (isPositive ? '+' : '-') : ''}{pointsValue} pts
                </Text>
              </View>
            </View>

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
                      {pointsValue > 0 ? (isPositive ? '+' : '-') : ''}{pointsValue} points
                    </Text>
                  </View>
                </View>
              </View>
            )}

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

function EditCategoryModal({ visible, category, onClose, onSave, onDelete, theme, existingCategories }: any) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [points, setPoints] = useState('5');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPositive, setIsPositive] = useState(false);

  const MAX_NAME_LENGTH = 30;
  const MAX_POINTS = 20;
  const MIN_POINTS = 1;

  const negativeEmojis = ['✕', '↓', '⊘', '≈', '−', '◁', '⊗', '∅', '⊖', '≠', '◀', '▽', '□', '△', '⊙', '◊'];
  const positiveEmojis = ['✓', '↑', '▲', '◎', '○', '◉', '⊕', '+', '★', '♡', '◆', '◈', '◐', '∞', '⊞', '✦'];
  const displayedEmojis = isPositive ? positiveEmojis : negativeEmojis;
  const color = isPositive ? '#10B981' : '#EF4444';

  React.useEffect(() => {
    if (category && visible) {
      setName(category.name);
      setEmoji(category.emoji);
      setCustomEmoji('');
      setPoints(String(Math.abs(category.default_points)));
      setShowEmojiPicker(false);
      setIsPositive(category.is_positive === 1);
    }
  }, [category, visible]);

  const checkDuplicateName = (nameToCheck: string): boolean => {
    const trimmedName = nameToCheck.trim().toLowerCase();
    return existingCategories.some(
      (cat: Category) => cat.name.toLowerCase() === trimmedName && cat.id !== category?.id
    );
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const finalEmoji = customEmoji || emoji;
    
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }
    if (checkDuplicateName(trimmedName)) {
      Alert.alert('Error', 'A category with this name already exists');
      return;
    }
    if (!finalEmoji) {
      Alert.alert('Error', 'Please select an emoji');
      return;
    }
    
    const pointsNum = Number(points);
    if (!points || isNaN(pointsNum) || pointsNum === 0) {
      Alert.alert('Error', 'Please enter valid points');
      return;
    }
    if (pointsNum < MIN_POINTS || pointsNum > MAX_POINTS) {
      Alert.alert('Error', `Points must be between ${MIN_POINTS} and ${MAX_POINTS}`);
      return;
    }

    try {
      const db = getDatabase();
      const pointsValue = isPositive ? Math.abs(pointsNum) : -Math.abs(pointsNum);
      db.runSync(
        'UPDATE categories SET name = ?, emoji = ?, default_points = ?, is_positive = ? WHERE id = ?',
        [trimmedName, finalEmoji, pointsValue, isPositive ? 1 : 0, category.id]
      );
      
      await onSave();
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category. Please try again.');
    }
  };

  const handlePointsChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '') {
      setPoints('1'); // Default to MIN_POINTS instead of empty
    } else {
      const num = parseInt(numericText, 10);
      if (num <= MAX_POINTS) {
        setPoints(numericText);
      }
    }
  };

  const handleCustomEmojiChange = (text: string) => {
    // Match any emoji including multi-character sequences
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    const matches = text.match(emojiRegex);
    if (matches && matches.length > 0) {
      setCustomEmoji(matches[0]); // Take first emoji
      setEmoji('');
      setShowEmojiPicker(false); // Close picker when custom emoji is entered
    } else if (text === '') {
      setCustomEmoji('');
    }
  };

  const selectEmoji = (e: string) => {
    setEmoji(e);
    setCustomEmoji('');
    setShowEmojiPicker(false);
  };

  const finalEmoji = customEmoji || emoji;
  const pointsValue = points ? Number(points) : MIN_POINTS;
  const isValid = name.trim().length >= 2 && finalEmoji && pointsValue >= MIN_POINTS;

  if (!category) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.editModalContent, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.editModalHeader, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.editModalTitle, { color: theme.text }]}>Edit Category</Text>
            <View style={styles.editHeaderRight}>
              <View style={styles.editTypeToggle}>
                <TouchableOpacity
                  style={[
                    styles.editTypeToggleBtn,
                    { backgroundColor: theme.backgroundSecondary },
                    !isPositive && { backgroundColor: '#EF444415', borderWidth: 2, borderColor: '#EF4444' }
                  ]}
                  onPress={() => setIsPositive(false)}
                >
                  <Ionicons name="remove-circle-outline" size={18} color={!isPositive ? '#EF4444' : theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editTypeToggleBtn,
                    { backgroundColor: theme.backgroundSecondary },
                    isPositive && { backgroundColor: '#10B98115', borderWidth: 2, borderColor: '#10B981' }
                  ]}
                  onPress={() => setIsPositive(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={isPositive ? '#10B981' : theme.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.editCloseBtn}>
                <Text style={[styles.editCloseBtnText, { color: theme.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false}>
            {/* Name Input - First */}
            <View style={styles.editSection}>
              <View style={styles.editSectionHeader}>
                <Text style={[styles.editSectionTitle, { color: theme.text }]}>Name</Text>
                <Text style={[
                  styles.editCharCount, 
                  { color: name.length >= MAX_NAME_LENGTH - 5 ? '#EF4444' : theme.textMuted }
                ]}>
                  {name.length}/{MAX_NAME_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.editNameInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: name.trim().length < 2 
                      ? theme.divider 
                      : checkDuplicateName(name.trim())
                        ? '#EF4444'
                        : color,
                    color: theme.text,
                  }
                ]}
                placeholder="Category name"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={(text) => setName(text.slice(0, MAX_NAME_LENGTH))}
                maxLength={MAX_NAME_LENGTH}
              />
              {name.trim().length >= 2 && checkDuplicateName(name.trim()) && (
                <Text style={styles.errorText}>A category with this name already exists</Text>
              )}
            </View>

            {/* Emoji Section */}
            <View style={styles.editSection}>
              <Text style={[styles.editSectionTitle, { color: theme.text }]}>Emoji</Text>
              <View style={styles.emojiDisplayRow}>
                <TouchableOpacity 
                  style={[
                    styles.currentEmojiBox, 
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: finalEmoji ? color : theme.divider,
                    }
                  ]}
                  onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Text style={styles.currentEmojiText}>{finalEmoji || '?'}</Text>
                </TouchableOpacity>
                
                <TextInput
                  style={[
                    styles.customEmojiInput,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.divider,
                      color: theme.text,
                    }
                  ]}
                  placeholder="Or paste custom"
                  placeholderTextColor={theme.textMuted}
                  value={customEmoji}
                  onChangeText={handleCustomEmojiChange}
                  maxLength={4}
                />
              </View>

              {showEmojiPicker && (
                <View style={[styles.emojiPickerBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={styles.emojiPickerGrid}>
                    {displayedEmojis.map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[
                          styles.emojiPickerItem,
                          emoji === e && !customEmoji && { backgroundColor: color + '20' }
                        ]}
                        onPress={() => selectEmoji(e)}
                      >
                        <Text style={styles.emojiPickerItemText}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Points Section */}
            <View style={styles.editSection}>
              <Text style={[styles.editSectionTitle, { color: theme.text }]}>Points</Text>
              <View style={styles.editPointsRow}>
                <TouchableOpacity
                  style={[styles.editPointsBtn, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => {
                    const current = pointsValue;
                    if (current > MIN_POINTS) setPoints(String(current - 1));
                  }}
                >
                  <Text style={[styles.editPointsBtnText, { color: theme.text }]}>−</Text>
                </TouchableOpacity>
                
                <View style={[styles.editPointsDisplay, { backgroundColor: color + '12' }]}>
                  <Text style={[styles.editPointsValue, { color }]}>
                    {pointsValue > 0 ? (isPositive ? '+' : '-') : ''}{pointsValue}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.editPointsBtn, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => {
                    const current = pointsValue;
                    if (current < MAX_POINTS) setPoints(String(current + 1));
                  }}
                >
                  <Text style={[styles.editPointsBtnText, { color: theme.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.editActionsRow}>
              <TouchableOpacity 
                style={[styles.editDeleteBtn, { backgroundColor: '#EF444412' }]}
                onPress={onDelete}
              >
                <Text style={styles.editDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.editSaveBtn, { opacity: isValid ? 1 : 0.5 }]} 
                onPress={handleSave}
                disabled={!isValid}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.editSaveGradient}
                >
                  <Text style={styles.editSaveBtnText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    fontFamily: 'Poppins_600SemiBold',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
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
    paddingBottom: 80,
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
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  usageSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  proBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_600SemiBold',
    minWidth: 40,
  },
  categoryGroup: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  categoryPoints: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
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
  editHint: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editHintText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  requiredText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#EF4444',
    marginTop: 6,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiPreviewBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPreviewText: {
    fontSize: 32,
  },
  emojiCustomInput: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
  },
  pointsInput: {
    width: 70,
    height: 48,
    borderWidth: 2,
    borderRadius: 14,
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_700Bold',
  },
  previewCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  previewPoints: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_700Bold',
  },
  // Edit Modal Styles
  editModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  editModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  editHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editTypeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  editTypeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTypeToggleText: {
    fontSize: 18,
  },
  editTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editTypeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  editCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCloseBtnText: {
    fontSize: 18,
  },
  editModalBody: {
    padding: 20,
    paddingBottom: 30,
  },
  editSection: {
    marginBottom: 20,
  },
  editSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editSectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 10,
  },
  editCharCount: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  emojiDisplayRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currentEmojiBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentEmojiText: {
    fontSize: 26,
  },
  customEmojiInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  emojiPickerBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
  },
  emojiPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerItemText: {
    fontSize: 22,
  },
  editNameInput: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  editPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editPointsBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPointsBtnText: {
    fontSize: 24,
    fontFamily: 'Poppins_500Medium',
  },
  editPointsDisplay: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPointsValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  editDeleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDeleteBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#EF4444',
  },
  editSaveBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  editSaveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  editSaveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
});