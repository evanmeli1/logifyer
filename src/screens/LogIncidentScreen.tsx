import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllPeople, getAllCategories, logIncident, getSettings } from '../database/db';
import { Person, Category } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LogIncidentScreen({ route }: any) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const preSelectedPersonId = route.params?.personId;

  // Data state
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(preSelectedPersonId || null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isMajor, setIsMajor] = useState(false);
  const [note, setNote] = useState('');
  const [majorMultiplier, setMajorMultiplier] = useState(3);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'negative' | 'positive'>('negative');
  const [showNote, setShowNote] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const categoryScaleAnims = useRef<Animated.Value[]>([]).current;
  const personScaleAnims = useRef<Animated.Value[]>([]).current;
  const optionsAnim = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  // Filter categories
  const negativeCategories = categories.filter(c => c.is_positive === 0);
  const positiveCategories = categories.filter(c => c.is_positive === 1);
  const displayedCategories = activeTab === 'negative' ? negativeCategories : positiveCategories;

  useFocusEffect(
    React.useCallback(() => {
      const peopleData = getAllPeople() as Person[];
      const categoriesData = getAllCategories() as Category[];
      const settingsData: any = getSettings();
      
      setPeople(peopleData);
      setCategories(categoriesData);
      setMajorMultiplier(settingsData?.major_multiplier || 3);

      // Initialize animation values for categories
      categoriesData.forEach((_, i) => {
        if (!categoryScaleAnims[i]) {
          categoryScaleAnims[i] = new Animated.Value(0);
        }
      });

      // Initialize animation values for people
      peopleData.forEach((_, i) => {
        if (!personScaleAnims[i]) {
          personScaleAnims[i] = new Animated.Value(0);
        }
      });

      // Reset form
      if (!preSelectedPersonId) setSelectedPersonId(null);
      setSelectedCategory(null);
      setIsMajor(false);
      setNote('');
      setShowNote(false);
      setActiveTab('negative');

      // Run entrance animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      optionsAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Stagger person chips
      peopleData.forEach((_, i) => {
        personScaleAnims[i]?.setValue(0);
        Animated.spring(personScaleAnims[i], {
          toValue: 1,
          friction: 6,
          tension: 100,
          delay: i * 50,
          useNativeDriver: true,
        }).start();
      });

      // Stagger category items
      setTimeout(() => {
        categoriesData.forEach((_, i) => {
          categoryScaleAnims[i]?.setValue(0);
          Animated.spring(categoryScaleAnims[i], {
            toValue: 1,
            friction: 6,
            tension: 100,
            delay: i * 40,
            useNativeDriver: true,
          }).start();
        });
      }, 200);

    }, [preSelectedPersonId])
  );

  // Tab switch animation
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === 'negative' ? 0 : 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Options panel animation
  useEffect(() => {
    Animated.spring(optionsAnim, {
      toValue: selectedCategory ? 1 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [selectedCategory]);

  // Button pulse when ready
  useEffect(() => {
    if (selectedCategory && selectedPersonId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      buttonPulse.setValue(1);
    }
  }, [selectedCategory, selectedPersonId]);

  const handleSave = () => {
    if (!selectedPersonId) {
      Alert.alert('Hold up!', 'Pick who this is about');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Hold up!', 'Select what happened');
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

      // Success animation then navigate
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.goBack();
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to log incident');
    }
  };

  const handlePersonSelect = (personId: number, index: number) => {
    // Bounce animation
    Animated.sequence([
      Animated.timing(personScaleAnims[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(personScaleAnims[index], {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setSelectedPersonId(personId);
  };

  const handleCategorySelect = (category: Category, index: number) => {
    // Bounce animation on correct index
    const globalIndex = activeTab === 'negative' ? index : index + negativeCategories.length;
    
    if (categoryScaleAnims[globalIndex]) {
      Animated.sequence([
        Animated.timing(categoryScaleAnims[globalIndex], {
          toValue: 0.95,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(categoryScaleAnims[globalIndex], {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setSelectedCategory(category);
  };

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  const getPointsDisplay = () => {
    if (!selectedCategory) return '';
    const points = isMajor
      ? selectedCategory.default_points * majorMultiplier
      : selectedCategory.default_points;
    return selectedCategory.is_positive ? `+${points}` : `${points}`;
  };

  const tabIndicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - 48) / 2],
  });

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Log</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Person Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Who's involved?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personRow}
            >
              {people.map((person, index) => {
                const isSelected = selectedPersonId === person.id;
                const scale = personScaleAnims[index] || new Animated.Value(1);
                return (
                  <Animated.View
                    key={person.id}
                    style={{ transform: [{ scale }] }}
                  >
                    <TouchableOpacity
                      onPress={() => handlePersonSelect(person.id, index)}
                      activeOpacity={0.7}
                      style={[
                        styles.personChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.card,
                          borderColor: isSelected ? theme.primary : theme.divider,
                          shadowColor: isSelected ? theme.primary : '#000',
                          shadowOpacity: isSelected ? 0.3 : 0.08,
                        },
                      ]}
                    >
                      <View style={[
                        styles.personAvatar,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : theme.primary + '20' }
                      ]}>
                        <Text style={[
                          styles.personInitial,
                          { color: isSelected ? '#FFF' : theme.primary }
                        ]}>
                          {person.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.personName,
                          { color: isSelected ? '#FFF' : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {person.name}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>

          {/* Category Tabs */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>What happened?</Text>
            
            <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    backgroundColor: activeTab === 'negative' ? '#EF4444' : '#10B981',
                    transform: [{ translateX: tabIndicatorTranslate }],
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.tab}
                onPress={() => setActiveTab('negative')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'negative' ? '#FFF' : theme.textMuted }
                ]}>
                  😔 Negative
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => setActiveTab('positive')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'positive' ? '#FFF' : theme.textMuted }
                ]}>
                  😊 Positive
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Action Buttons */}
            <View style={styles.actionList}>
              {displayedCategories.map((cat, index) => {
                const isSelected = selectedCategory?.id === cat.id;
                const globalIndex = activeTab === 'negative' ? index : index + negativeCategories.length;
                const scale = categoryScaleAnims[globalIndex] || new Animated.Value(1);
                const accentColor = activeTab === 'negative' ? '#EF4444' : '#10B981';

                return (
                  <Animated.View
                    key={cat.id}
                    style={{ transform: [{ scale }] }}
                  >
                    <TouchableOpacity
                      onPress={() => handleCategorySelect(cat, index)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={isSelected 
                          ? [accentColor, accentColor + 'DD']
                          : [theme.card, theme.card]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.actionButton,
                          {
                            borderColor: isSelected ? accentColor : theme.divider,
                            shadowColor: isSelected ? accentColor : '#000',
                            shadowOpacity: isSelected ? 0.3 : 0.08,
                          },
                        ]}
                      >
                        <Text style={styles.actionEmoji}>{cat.emoji}</Text>
                        
                        <View style={styles.actionContent}>
                          <Text
                            style={[
                              styles.actionName,
                              { color: isSelected ? '#FFF' : theme.text }
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                          <Text
                            style={[
                              styles.actionSubtext,
                              { color: isSelected ? 'rgba(255,255,255,0.75)' : theme.textMuted }
                            ]}
                          >
                            {cat.is_positive ? 'Positive' : 'Negative'} interaction
                          </Text>
                        </View>
                        
                        <View style={[
                          styles.actionPoints,
                          { 
                            backgroundColor: isSelected 
                              ? 'rgba(255,255,255,0.2)' 
                              : accentColor + '12' 
                          }
                        ]}>
                          <Text style={[
                            styles.actionPointsText,
                            { color: isSelected ? '#FFF' : accentColor }
                          ]}>
                            {cat.is_positive ? '+' : ''}{cat.default_points}
                          </Text>
                        </View>

                        {isSelected && (
                          <View style={styles.actionCheck}>
                            <Text style={styles.actionCheckText}>✓</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* Options Panel - Animated */}
          <Animated.View
            style={[
              styles.optionsPanel,
              {
                backgroundColor: theme.card,
                opacity: optionsAnim,
                transform: [
                  {
                    translateY: optionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: optionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={selectedCategory ? 'auto' : 'none'}
          >
            <View style={styles.optionsRow}>
              {/* Major Toggle */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setIsMajor(!isMajor)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.majorToggle,
                    {
                      backgroundColor: isMajor ? theme.primary : 'transparent',
                      borderColor: isMajor ? theme.primary : theme.divider,
                    },
                  ]}
                >
                  {isMajor && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>
                    Major Event
                  </Text>
                  <Text style={[styles.optionSub, { color: theme.textMuted }]}>
                    {majorMultiplier}x multiplier
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Note Toggle */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setShowNote(!showNote)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.noteToggle,
                    {
                      backgroundColor: showNote ? theme.primary + '20' : 'transparent',
                      borderColor: showNote ? theme.primary : theme.divider,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>📝</Text>
                </View>
                <Text style={[styles.optionLabel, { color: theme.text }]}>
                  {showNote ? 'Hide Note' : 'Add Note'}
                </Text>
              </TouchableOpacity>

              {/* Points Badge */}
              {selectedCategory && (
                <View
                  style={[
                    styles.totalPoints,
                    {
                      backgroundColor: selectedCategory.is_positive ? '#10B981' : '#EF4444',
                    },
                  ]}
                >
                  <Text style={styles.totalPointsText}>{getPointsDisplay()}</Text>
                  <Text style={styles.totalPointsLabel}>pts</Text>
                </View>
              )}
            </View>

            {/* Note Input - Simple show/hide */}
            {showNote && (
              <View style={styles.noteContainer}>
                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.divider,
                    },
                  ]}
                  placeholder="What happened? Add context..."
                  placeholderTextColor={theme.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ scale: buttonPulse }] },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.9}
          disabled={!selectedCategory || !selectedPersonId}
        >
          <LinearGradient
            colors={
              selectedCategory && selectedPersonId
                ? [theme.primary, theme.primaryLight]
                : [theme.textMuted, theme.textMuted]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fab}
          >
            <Text style={styles.fabText}>
              {selectedCategory && selectedPerson
                ? `Log ${selectedCategory.emoji} → ${selectedPerson.name}`
                : 'Select person & event'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
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
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  personRow: {
    paddingVertical: 4,
    gap: 10,
    flexDirection: 'row',
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInitial: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  personName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    maxWidth: 100,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    height: '100%',
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  // Action Button Styles
  actionList: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  actionEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  actionPoints: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 12,
  },
  actionPointsText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  actionCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionCheckText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  optionsPanel: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  majorToggle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  noteToggle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  optionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  totalPoints: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  totalPointsText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  totalPointsLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  noteContainer: {
    marginTop: 12,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
  },
  fab: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
});