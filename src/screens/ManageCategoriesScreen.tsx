import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllCategories, deleteCategory, addCustomCategory } from '../database/db';
import { Category } from '../types';
import { useTheme } from '../theme';

export default function ManageCategoriesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const loadCategories = () => {
    const categoriesData = getAllCategories() as Category[];
    setCategories(categoriesData);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [])
  );

  const customCategories = categories.filter(c => c.is_custom === 1);
  const defaultCategories = categories.filter(c => c.is_custom === 0);
  const customCount = customCategories.length;
  const canAddMore = customCount < 3;

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

  const renderCategory = ({ item }: { item: Category }) => {
    const isCustom = item.is_custom === 1;
    const isPositive = item.is_positive === 1;
    const color = isPositive ? '#10B981' : '#EF4444';

    return (
      <View style={[styles.categoryCard, { backgroundColor: theme.card }]}>
        <View style={[styles.emojiContainer, { backgroundColor: color + '15' }]}>
          <Text style={styles.categoryEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.categoryPoints, { color }]}>
            {isPositive ? '+' : ''}{item.default_points} points
          </Text>
        </View>
        {isCustom ? (
          <TouchableOpacity
            style={styles.deleteButton}
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

      {/* Usage Card */}
      <View style={[styles.usageCard, { backgroundColor: theme.card }]}>
        <View style={styles.usageInfo}>
          <Text style={[styles.usageTitle, { color: theme.text }]}>Custom Categories</Text>
          <Text style={[styles.usageSubtitle, { color: theme.textMuted }]}>
            {canAddMore ? `${3 - customCount} slots remaining` : 'Limit reached'}
          </Text>
        </View>
        <View style={styles.usageCounter}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.usageDot,
                { backgroundColor: i < customCount ? theme.primary : theme.divider }
              ]}
            />
          ))}
        </View>
        {!canAddMore && (
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: theme.primary + '15' }]}
            onPress={() => (navigation as any).navigate('Paywall')}
          >
            <Text style={[styles.upgradeButtonText, { color: theme.primary }]}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[...customCategories, ...defaultCategories]}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          customCategories.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>YOUR CATEGORIES</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.emptyIcon}>📝</Text>
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>No custom categories yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Create your own incident types
            </Text>
          </View>
        }
      />

      {canAddMore && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            style={styles.fabGradient}
          >
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

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

  const commonEmojis = [
    '😡', '😤', '🤬', '😒', '🙄', '😠', '💔', '😢', '😭', '🤯',
    '😊', '😄', '🥰', '❤️', '💪', '🎉', '✨', '🌟', '👍', '🙌'
  ];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (!emoji.trim()) {
      Alert.alert('Error', 'Please select an emoji');
      return;
    }
    if (!points || isNaN(Number(points))) {
      Alert.alert('Error', 'Please enter valid points');
      return;
    }

    const pointsValue = isPositive ? Math.abs(Number(points)) : -Math.abs(Number(points));
    addCustomCategory(name.trim(), emoji, pointsValue, isPositive);
    
    setName('');
    setEmoji('');
    setPoints('5');
    setIsPositive(false);
    onAdd();
  };

  const resetAndClose = () => {
    setName('');
    setEmoji('');
    setPoints('5');
    setIsPositive(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Category</Text>
            <TouchableOpacity onPress={resetAndClose} style={styles.modalCloseButton}>
              <Text style={[styles.modalClose, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>NAME</Text>
            <TextInput
              style={[
                styles.textInput,
                { 
                  borderColor: name ? theme.primary : theme.divider, 
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                }
              ]}
              placeholder="e.g., Interrupted me"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>EMOJI</Text>
            <View style={styles.emojiGrid}>
              {commonEmojis.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.emojiButton,
                    { borderColor: theme.divider, backgroundColor: theme.card },
                    emoji === e && [styles.emojiButtonSelected, { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]
                  ]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>TYPE</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { borderColor: theme.divider, backgroundColor: theme.card },
                  !isPositive && { borderColor: '#EF4444', backgroundColor: '#EF4444' + '15' }
                ]}
                onPress={() => setIsPositive(false)}
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
                  { borderColor: theme.divider, backgroundColor: theme.card },
                  isPositive && { borderColor: '#10B981', backgroundColor: '#10B981' + '15' }
                ]}
                onPress={() => setIsPositive(true)}
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

            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>POINTS</Text>
            <TextInput
              style={[
                styles.textInput,
                { 
                  borderColor: theme.divider, 
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                }
              ]}
              placeholder="5"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={points}
              onChangeText={setPoints}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={[theme.primary, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveButtonText}>Add Category</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  usageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  usageInfo: {
    flex: 1,
  },
  usageTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  usageSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  usageCounter: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  usageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  upgradeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 12,
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
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 30,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
  },
  emojiButtonSelected: {},
  emojiText: {
    fontSize: 22,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
  },
  typeEmoji: {
    fontSize: 20,
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});