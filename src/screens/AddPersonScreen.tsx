import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { 
  addPerson, 
  getAllRelationshipTypes, 
  addCustomRelationshipType, 
  deleteCustomRelationshipType,
  getCustomRelationshipTypesCount,
  checkPersonNameExists,
} from '../database/db';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { checkSubscription } from '../services/purchases';
import Animated, { FadeInDown, FadeIn, SlideInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMOJI_OPTIONS = [
  '😊', '😎', '🥰', '🤗', '😇', '🙂', '😌', '🤩',
  '👋', '👨‍👩‍👧', '❤️', '💔', '💼', '🤝', '👥', '👤',
  '⭐', '✨', '💫', '🌟', '💎', '👑', '🎯', '🔥',
  '🏠', '🎓', '💪', '🎨', '🎮', '📚', '💻', '🎵',
];

interface RelationshipType {
  id: number;
  type: string;
  emoji: string;
  is_custom: number;
}

export default function AddPersonScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('Friend');
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [customCount, setCustomCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('😊');

  useEffect(() => {
    loadRelationshipTypes();
    checkPremiumStatus();
  }, []);

  const loadRelationshipTypes = () => {
    const types = getAllRelationshipTypes() as RelationshipType[];
    setRelationshipTypes(types);
    setCustomCount(getCustomRelationshipTypesCount());
  };

  const checkPremiumStatus = async () => {
    try {
      const premium = await checkSubscription();
      setIsPremium(premium);
    } catch (error) {
      console.log('Error checking premium:', error);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    // Check for duplicate
    if (checkPersonNameExists(trimmedName)) {
      Alert.alert('Duplicate Name', `"${trimmedName}" already exists. Please use a different name.`);
      return;
    }

    try {
      await addPerson(trimmedName, selectedType);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add person');
      console.error(error);
    }
  };

  const handleAddCustomType = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature ✨',
        'Custom relationship types are available for Premium members.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Settings', { screen: 'Paywall' }) },
        ]
      );
      return;
    }

    if (customCount >= 10) {
      Alert.alert('Limit Reached', 'You can only create up to 10 custom relationship types.');
      return;
    }

    setShowAddModal(true);
  };

  const handleSaveCustomType = () => {
    const trimmedName = newTypeName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 15) {
      Alert.alert('Error', 'Name must be 15 characters or less');
      return;
    }

    try {
      addCustomRelationshipType(trimmedName, newTypeEmoji);
      loadRelationshipTypes();
      setSelectedType(trimmedName);
      setShowAddModal(false);
      setNewTypeName('');
      setNewTypeEmoji('😊');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add custom type');
    }
  };

  const handleLongPressType = (type: RelationshipType) => {
    if (type.is_custom === 0) return; // Can't delete default types

    Alert.alert(
      'Delete Custom Type',
      `Delete "${type.type}"? This won't affect existing people with this relationship type.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteCustomRelationshipType(type.type);
            loadRelationshipTypes();
            if (selectedType === type.type) {
              setSelectedType('Friend');
            }
          }
        },
      ]
    );
  };

  const selectedTypeData = relationshipTypes.find(t => t.type === selectedType);

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
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
        <Text style={styles.headerTitle}>Add Person</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview Card */}
        <Animated.View 
          entering={FadeInDown.delay(0).duration(400)}
          style={[styles.previewCard, { backgroundColor: theme.card }]}
        >
          <View style={[styles.previewAvatar, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.previewAvatarText, { color: theme.primary }]}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={[styles.previewName, { color: theme.text }]}>
            {name || 'New Person'}
          </Text>
          <View style={[styles.previewBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={styles.previewBadgeEmoji}>{selectedTypeData?.emoji || '👤'}</Text>
            <Text style={[styles.previewBadgeText, { color: theme.primary }]}>{selectedType}</Text>
          </View>
        </Animated.View>

        {/* Name Input */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.section, { backgroundColor: theme.card }]}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.textMuted }]}>NAME</Text>
            {name.length === 1 && (
              <Text style={[styles.errorText, { color: '#EF4444' }]}>Too short</Text>
            )}
            {name.length >= 2 && checkPersonNameExists(name.trim()) && (
              <Text style={[styles.errorText, { color: '#EF4444' }]}>Already exists</Text>
            )}
            <Text style={[styles.charCount, { color: name.length >= 20 ? '#EF4444' : theme.textMuted }]}>
              {name.length}/25
            </Text>
          </View>
          <View style={[
            styles.inputContainer, 
            { 
              borderColor: name.length === 0 
                ? theme.divider 
                : name.length === 1 
                  ? '#EF4444' 
                  : checkPersonNameExists(name.trim())
                    ? '#EF4444'
                    : '#10B981',
              backgroundColor: theme.backgroundSecondary 
            }
          ]}>
            <View style={[styles.inputIcon, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.inputIconText}>👤</Text>
            </View>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Enter their name"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={25}
            />
            {name.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setName('')}
              >
                <Text style={[styles.clearButtonText, { color: theme.textMuted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Relationship Type - Horizontal Chips */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)}
          style={[styles.section, { backgroundColor: theme.card }]}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.textMuted }]}>RELATIONSHIP</Text>
            {customCount > 0 && (
              <Text style={[styles.customCount, { color: theme.textMuted }]}>
                {customCount}/10 custom
              </Text>
            )}
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {relationshipTypes.map((item) => {
              const isSelected = selectedType === item.type;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedType(item.type)}
                  onLongPress={() => handleLongPressType(item)}
                  delayLongPress={500}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                      borderColor: isSelected ? theme.primary : theme.divider,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#FFF' : theme.text },
                    ]}
                  >
                    {item.type}
                  </Text>
                  {item.is_custom === 1 && (
                    <View style={[styles.customBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : theme.primary + '20' }]}>
                      <Text style={[styles.customBadgeText, { color: isSelected ? '#FFF' : theme.primary }]}>✦</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          
          {/* Add Custom Button - Below chips */}
          <TouchableOpacity
            onPress={handleAddCustomType}
            activeOpacity={0.7}
            style={[
              styles.addButton,
              { 
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.divider,
              },
            ]}
          >
            <Text style={[styles.addButtonPlus, { color: theme.primary }]}>+</Text>
            <Text style={[styles.addButtonText, { color: theme.text }]}>Create Custom Type</Text>
            {!isPremium && (
              <View style={[styles.proBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            {isPremium ? 'Long press custom types to delete' : 'Upgrade to PRO to create custom types'}
          </Text>
        </Animated.View>

        {/* Tips */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(400)}
          style={[styles.tipsSection, { backgroundColor: theme.primary + '08' }]}
        >
          <Text style={styles.tipsIcon}>💡</Text>
          <Text style={[styles.tipsText, { color: theme.textMuted }]}>
            You can log positive and negative incidents with this person to track your relationship health.
          </Text>
        </Animated.View>
      </ScrollView>

      <TouchableOpacity 
        style={[styles.saveButton, { opacity: name.trim().length >= 2 ? 1 : 0.5 }]} 
        onPress={handleSave}
        disabled={name.trim().length < 2}
      >
        <LinearGradient
          colors={[theme.primary, theme.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveGradient}
        >
          <Text style={styles.saveButtonText}>Add {name || 'Person'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Custom Type Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <Pressable 
              style={[styles.modalContent, { backgroundColor: theme.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Relationship Type</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={[styles.modalClose, { color: theme.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Emoji Selector */}
              <Text style={[styles.modalLabel, { color: theme.textMuted }]}>EMOJI</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.emojiScrollView}
                contentContainerStyle={styles.emojiContainer}
              >
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setNewTypeEmoji(emoji)}
                    style={[
                      styles.emojiOption,
                      {
                        backgroundColor: newTypeEmoji === emoji ? theme.primary + '20' : theme.backgroundSecondary,
                        borderColor: newTypeEmoji === emoji ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={styles.emojiOptionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Name Input */}
              <View style={styles.modalLabelRow}>
                <Text style={[styles.modalLabel, { color: theme.textMuted }]}>NAME</Text>
                <Text style={[styles.modalCharCount, { color: newTypeName.length >= 12 ? '#EF4444' : theme.textMuted }]}>
                  {newTypeName.length}/15
                </Text>
              </View>
              <View style={[styles.modalInputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.divider }]}>
                <Text style={styles.modalInputEmoji}>{newTypeEmoji}</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text }]}
                  placeholder="e.g. Mentor, Neighbor..."
                  placeholderTextColor={theme.textMuted}
                  value={newTypeName}
                  onChangeText={setNewTypeName}
                  maxLength={15}
                  autoFocus
                />
              </View>

              {/* Preview */}
              <View style={[styles.modalPreview, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.modalPreviewLabel, { color: theme.textMuted }]}>Preview:</Text>
                <View style={[styles.previewChip, { backgroundColor: theme.primary }]}>
                  <Text style={styles.previewChipEmoji}>{newTypeEmoji}</Text>
                  <Text style={styles.previewChipText}>{newTypeName || 'Type name'}</Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveCustomType}
                disabled={newTypeName.trim().length < 2}
                style={[styles.modalSaveButton, { opacity: newTypeName.trim().length >= 2 ? 1 : 0.5 }]}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSaveGradient}
                >
                  <Text style={styles.modalSaveText}>Create Type</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
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
    fontFamily: 'Inter_700Bold',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  previewCard: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewAvatarText: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
  },
  previewName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  previewBadgeEmoji: {
    fontSize: 16,
  },
  previewBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    marginTop: 16,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  customCount: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIconText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  // Horizontal Chips
  chipsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    gap: 8,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  customBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  customBadgeText: {
    fontSize: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 8,
  },
  addButtonPlus: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  proBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
    textAlign: 'center',
  },
  tipsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  tipsIcon: {
    fontSize: 24,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  saveButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  modalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  modalCharCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  emojiScrollView: {
    maxHeight: 50,
  },
  emojiContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  emojiOptionText: {
    fontSize: 22,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  modalInputEmoji: {
    fontSize: 24,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    paddingVertical: 14,
  },
  modalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  modalPreviewLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  previewChipEmoji: {
    fontSize: 16,
  },
  previewChipText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  modalSaveButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});