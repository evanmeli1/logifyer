import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllCategories, deleteCategory, addCustomCategory } from '../database/db';
import { Category } from '../types';


export default function ManageCategoriesScreen() {
  const navigation = useNavigation();
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

    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryEmoji}>{item.emoji}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={[styles.categoryPoints, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
              {isPositive ? '+' : ''}{item.default_points} points
            </Text>
          </View>
          {isCustom && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id, item.name)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Custom Categories: {customCount}/3</Text>
        {!canAddMore && (
          <Text style={styles.limitText}>Upgrade to Premium for unlimited</Text>
        )}
      </View>

      <FlatList
        data={[...customCategories, ...defaultCategories]}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          customCategories.length > 0 ? (
            <Text style={styles.sectionTitle}>Your Custom Categories</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No custom categories yet</Text>
            <Text style={styles.emptySubtext}>Create your own incident types</Text>
          </View>
        }
      />

      {canAddMore && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <AddCategoryModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={() => {
          loadCategories();
          setIsAddModalVisible(false);
        }}
      />
    </View>
  );
}

function AddCategoryModal({ visible, onClose, onAdd }: any) {
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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Custom Category</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Interrupted me"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Select Emoji</Text>
            <View style={styles.emojiGrid}>
              {commonEmojis.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiButton, emoji === e && styles.emojiButtonSelected]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, !isPositive && styles.typeButtonSelected]}
                onPress={() => setIsPositive(false)}
              >
                <Text style={[styles.typeButtonText, !isPositive && styles.typeButtonTextSelected]}>
                  Negative
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, isPositive && styles.typeButtonSelected]}
                onPress={() => setIsPositive(true)}
              >
                <Text style={[styles.typeButtonText, isPositive && styles.typeButtonTextSelected]}>
                  Positive
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Default Points</Text>
            <TextInput
              style={styles.textInput}
              placeholder="5"
              keyboardType="numeric"
              value={points}
              onChangeText={setPoints}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Add Category</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryCard: {
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryPoints: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  emojiButtonSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  emojiText: {
    fontSize: 24,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});