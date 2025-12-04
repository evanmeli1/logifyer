import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { addPerson } from '../database/db';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RELATIONSHIP_TYPES = [
  { type: 'Friend', emoji: '👋' },
  { type: 'Family', emoji: '👨‍👩‍👧' },
  { type: 'Partner', emoji: '❤️' },
  { type: 'Ex', emoji: '💔' },
  { type: 'Coworker', emoji: '💼' },
  { type: 'Acquaintance', emoji: '🤝' },
];

export default function AddPersonScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('Friend');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      await addPerson(name.trim(), selectedType);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add person');
      console.error(error);
    }
  };

  const selectedTypeData = RELATIONSHIP_TYPES.find(t => t.type === selectedType);

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
            <Text style={styles.previewBadgeEmoji}>{selectedTypeData?.emoji}</Text>
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
            <Text style={[styles.charCount, { color: name.length >= 20 ? '#EF4444' : theme.textMuted }]}>
              {name.length}/25
            </Text>
          </View>
          <View style={[styles.inputContainer, { borderColor: name ? theme.primary : theme.divider, backgroundColor: theme.backgroundSecondary }]}>
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

        {/* Relationship Type - Floating Bubbles */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)}
          style={[styles.section, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.label, { color: theme.textMuted }]}>RELATIONSHIP</Text>
          <View style={styles.bubblesContainer}>
            {RELATIONSHIP_TYPES.map((item) => {
              const isSelected = selectedType === item.type;
              return (
                <View key={item.type} style={styles.bubbleWrapper}>
                  <TouchableOpacity
                    onPress={() => setSelectedType(item.type)}
                    activeOpacity={0.8}
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.primary : theme.divider,
                        shadowColor: isSelected ? theme.primary : '#000',
                        shadowOpacity: isSelected ? 0.4 : 0.08,
                        transform: [{ scale: isSelected ? 1.08 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.bubbleEmoji}>{item.emoji}</Text>
                    
                    {isSelected && (
                      <View style={styles.bubbleCheck}>
                        <Text style={[styles.bubbleCheckText, { color: theme.primary }]}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <Text 
                    style={[
                      styles.bubbleName, 
                      { 
                        color: isSelected ? theme.primary : theme.text,
                        fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                      }
                    ]}
                  >
                    {item.type}
                  </Text>
                </View>
              );
            })}
          </View>
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
        style={[styles.saveButton, { opacity: name.trim() ? 1 : 0.5 }]} 
        onPress={handleSave}
        disabled={!name.trim()}
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
  label: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  charCount: {
    fontSize: 12,
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
  // Floating Bubbles Styles
  bubblesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  bubbleWrapper: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 80) / 3,
  },
  bubble: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 8,
  },
  bubbleEmoji: {
    fontSize: 28,
  },
  bubbleCheck: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleCheckText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  bubbleName: {
    fontSize: 12,
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
});