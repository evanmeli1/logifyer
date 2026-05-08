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
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllPeople, getAllCategories, logIncident, getSettings } from '../database/db';
import { Person, Category } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FeelingKey = 'calm' | 'joy' | 'tension' | 'sad' | 'connect' | 'anxious';

const BALLOONS: Array<{
  key: FeelingKey;
  title: string;
  subtitle: string;
  grad: [string, string];
}> = [
  { key: 'calm', title: 'Calm', subtitle: 'Peaceful / Steady', grad: ['#60A5FA', '#93C5FD'] },
  { key: 'joy', title: 'Warmth', subtitle: 'Joyful / Caring', grad: ['#FBBF24', '#FDE68A'] },
  { key: 'connect', title: 'Trust', subtitle: 'Close / Clear', grad: ['#34D399', '#A7F3D0'] },

  { key: 'anxious', title: 'Uneasy', subtitle: 'Worried / Uncertain', grad: ['#A78BFA', '#C4B5FD'] },
  { key: 'sad', title: 'Low', subtitle: 'Sad / Distant', grad: ['#9CA3AF', '#D1D5DB'] },
  { key: 'tension', title: 'Tense', subtitle: 'Angry / Strained', grad: ['#F87171', '#FCA5A5'] },
];


export default function LogIncidentScreen({ route }: any) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const preSelectedPersonId = route.params?.personId;
  const fromPersonDetail = route.params?.fromPersonDetail;

  // NEW: feelingKey passed in from Home balloon picker
  const initialFeelingKey = route.params?.feelingKey as FeelingKey | undefined;

  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    preSelectedPersonId || null
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isMajor, setIsMajor] = useState(false);
  const [note, setNote] = useState('');
  const [majorMultiplier, setMajorMultiplier] = useState(3);
  const [activeTab, setActiveTab] = useState<'negative' | 'positive'>('negative');
  const [showNote, setShowNote] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // NEW: selected feeling state
  const [selectedFeelingKey, setSelectedFeelingKey] = useState<FeelingKey>(
      initialFeelingKey || 'calm'
    );



  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);

  const openMenu = () => {
    setMenuVisible(true);
    menuScale.value = withSpring(1, { damping: 20, stiffness: 500, mass: 0.5 });
    menuOpacity.value = withTiming(1, { duration: 80 });
  };

  const closeMenu = () => {
    menuScale.value = withTiming(0, { duration: 120 });
    menuOpacity.value = withTiming(0, { duration: 80 });
    setTimeout(() => setMenuVisible(false), 120);
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }, { translateY: (1 - menuScale.value) * -10 }],
    opacity: menuOpacity.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value * 0.3,
  }));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const categoryScaleAnims = useRef<Animated.Value[]>([]).current;
  const personScaleAnims = useRef<Animated.Value[]>([]).current;
  const optionsAnim = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

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

      categoriesData.forEach((_, i) => {
        if (!categoryScaleAnims[i]) categoryScaleAnims[i] = new Animated.Value(0);
      });
      peopleData.forEach((_, i) => {
        if (!personScaleAnims[i]) personScaleAnims[i] = new Animated.Value(0);
      });

      if (!preSelectedPersonId) setSelectedPersonId(null);
      setSelectedCategory(null);
      setIsMajor(false);
      setNote('');
      setShowNote(false);
      setActiveTab('negative');

      // NEW: keep feeling if passed, otherwise reset to null
      const nextFeeling = route.params?.feelingKey as FeelingKey | undefined;
      setSelectedFeelingKey(nextFeeling || 'calm');


      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      optionsAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

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
    }, [preSelectedPersonId, route?.params?.feelingKey])
  );

  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === 'negative' ? 0 : 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    Animated.spring(optionsAnim, {
      toValue: selectedCategory ? 1 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory && selectedPersonId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
          Animated.timing(buttonPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      buttonPulse.setValue(1);
    }
  }, [selectedCategory, selectedPersonId]);

  const buildFinalNote = () => {
    const base = note.trim();

    if (!selectedFeelingKey) {
      return base || undefined;
    }

    const meta = BALLOONS.find(b => b.key === selectedFeelingKey);
    const feelingText = meta ? `${meta.title} (${meta.subtitle})` : selectedFeelingKey;

    // Store feeling in note (until DB adds a real field)
    if (!base) return `Feeling: ${feelingText}`;
    if (base.toLowerCase().startsWith('feeling:')) return base;
    return `Feeling: ${feelingText}\n\n${base}`;
  };

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
      const success = logIncident(
        selectedPersonId,
        selectedCategory.id,
        selectedCategory.default_points,
        isMajor,
        buildFinalNote(),
        selectedFeelingKey || 'calm'
      );

      if (!success) {
        Alert.alert('Error', 'Failed to log incident. Please try again.');
        return;
      }

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]).start(() => navigation.goBack());
    } catch (error) {
      Alert.alert('Error', 'Failed to log incident');
    }
  };

  const handlePersonSelect = (personId: number, index: number) => {
    Animated.sequence([
      Animated.timing(personScaleAnims[index], { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(personScaleAnims[index], { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    setSelectedPersonId(personId);
  };

  const handleCategorySelect = (category: Category, index: number) => {
    const globalIndex = activeTab === 'negative' ? index : index + negativeCategories.length;
    if (categoryScaleAnims[globalIndex]) {
      Animated.sequence([
        Animated.timing(categoryScaleAnims[globalIndex], { toValue: 0.95, duration: 80, useNativeDriver: true }),
        Animated.spring(categoryScaleAnims[globalIndex], { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }
    setSelectedCategory(category);
  };

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  const getPointsDisplay = () => {
    if (!selectedCategory) return '';
    const points = isMajor ? selectedCategory.default_points * majorMultiplier : selectedCategory.default_points;
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
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {fromPersonDetail ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <Text style={styles.headerTitle}>New Log</Text>

        <TouchableOpacity onPress={openMenu} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>⋯</Text>
        </TouchableOpacity>
      </LinearGradient>

      {people.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../../assets/logi12345.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />

          <Text style={[styles.emptyTitle, { color: theme.text }]}>No people to log for</Text>

          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Add someone first to start tracking incidents
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              (navigation as any).getParent()?.navigate('People');
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>Go to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {menuVisible && (
            <>
              <Reanimated.View style={[styles.menuOverlay, overlayAnimatedStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
              </Reanimated.View>
              <Reanimated.View
                style={[styles.floatingMenu, { backgroundColor: theme.card }, menuAnimatedStyle]}
              >
                <View style={[styles.menuArrow, { borderBottomColor: theme.card }]} />
                <TouchableOpacity
                  style={[styles.floatingMenuItem, { borderBottomColor: theme.divider }]}
                  onPress={() => {
                    closeMenu();
                    setTimeout(() => (navigation as any).navigate('ManageCategories'), 200);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={styles.menuItemIconText}>📝</Text>
                  </View>
                  <Text style={[styles.floatingMenuText, { color: theme.text }]}>
                    Manage Categories
                  </Text>
                  <Text style={[styles.menuItemArrow, { color: theme.textMuted }]}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.floatingMenuItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    closeMenu();
                    setTimeout(() => (navigation as any).navigate('CategoryWeights'), 200);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: '#F59E0B15' }]}>
                    <Text style={styles.menuItemIconText}>⚖️</Text>
                  </View>
                  <Text style={[styles.floatingMenuText, { color: theme.text }]}>
                    Category Weights
                  </Text>
                  <Text style={[styles.menuItemArrow, { color: theme.textMuted }]}>›</Text>
                </TouchableOpacity>
              </Reanimated.View>
            </>
          )}

          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* NEW: Feeling Section */}
            <View style={styles.stickySectionFirst}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Overall feeling
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.balloonRow}
              >
                {BALLOONS.map(b => {
                  const isSelected = selectedFeelingKey === b.key;

                  return (
                    <TouchableOpacity
                      key={b.key}
                      onPress={() => setSelectedFeelingKey(b.key)}
                      activeOpacity={0.9}
                      style={styles.balloonHit}
                    >
                      <LinearGradient
                        colors={isSelected ? b.grad : [theme.card, theme.card]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.balloonCard,
                          { borderColor: isSelected ? 'transparent' : theme.divider },
                        ]}
                      >
                        <Text style={[styles.balloonTitle, { color: isSelected ? '#111827' : theme.text }]}>
                          {b.title}
                        </Text>
                        <Text
                          style={[
                            styles.balloonSubtitle,
                            { color: isSelected ? 'rgba(17,24,39,0.75)' : theme.textMuted },
                          ]}
                        >
                          {b.subtitle}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Person Section */}
            <View style={styles.stickySection}>
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
                    <Animated.View key={person.id} style={{ transform: [{ scale }] }}>
                      <TouchableOpacity
                        onPress={() => handlePersonSelect(person.id, index)}
                        activeOpacity={0.7}
                        style={[
                          styles.personChip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.card,
                            borderColor: isSelected ? theme.primary : theme.divider,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.personAvatar,
                            {
                              backgroundColor: isSelected
                                ? 'rgba(255,255,255,0.25)'
                                : theme.primary + '15',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.personInitial,
                              { color: isSelected ? '#FFF' : theme.primary },
                            ]}
                          >
                            {person.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={[styles.personName, { color: isSelected ? '#FFF' : theme.text }]}
                          numberOfLines={1}
                        >
                          {person.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.personCheck}>
                            <Text style={styles.personCheckText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </View>

            {/* What Happened - STICKY */}
            <View style={styles.stickySection}>
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
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('negative')} activeOpacity={0.7}>
                  <Text style={[styles.tabText, { color: activeTab === 'negative' ? '#FFF' : theme.textMuted }]}>
                    😔 Negative
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('positive')} activeOpacity={0.7}>
                  <Text style={[styles.tabText, { color: activeTab === 'positive' ? '#FFF' : theme.textMuted }]}>
                    😊 Positive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Categories */}
            <ScrollView
              style={styles.categoryScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.actionList}>
                {displayedCategories.map((cat, index) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  const globalIndex =
                    activeTab === 'negative' ? index : index + negativeCategories.length;
                  const scale = categoryScaleAnims[globalIndex] || new Animated.Value(1);
                  const accentColor = activeTab === 'negative' ? '#EF4444' : '#10B981';
                  return (
                    <Animated.View key={cat.id} style={{ transform: [{ scale }] }}>
                      <TouchableOpacity onPress={() => handleCategorySelect(cat, index)} activeOpacity={0.8}>
                        <LinearGradient
                          colors={isSelected ? [accentColor, accentColor + 'DD'] : [theme.card, theme.card]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.actionButton, { borderColor: isSelected ? accentColor : theme.divider }]}
                        >
                          <Text style={styles.actionEmoji}>{cat.emoji}</Text>
                          <View style={styles.actionContent}>
                            <Text style={[styles.actionName, { color: isSelected ? '#FFF' : theme.text }]} numberOfLines={1}>
                              {cat.name}
                            </Text>
                            <Text style={[styles.actionSubtext, { color: isSelected ? 'rgba(255,255,255,0.75)' : theme.textMuted }]}>
                              {cat.is_positive ? 'Positive' : 'Negative'} interaction
                            </Text>
                          </View>
                          <View style={[styles.actionPoints, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : accentColor + '12' }]}>
                            <Text style={[styles.actionPointsText, { color: isSelected ? '#FFF' : accentColor }]}>
                              {cat.is_positive ? '+' : ''}
                              {cat.default_points}
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

              {/* Options Panel */}
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
                  <TouchableOpacity style={styles.optionItem} onPress={() => setIsMajor(!isMajor)} activeOpacity={0.7}>
                    <View style={[styles.majorToggle, { backgroundColor: isMajor ? theme.primary : 'transparent', borderColor: isMajor ? theme.primary : theme.divider }]}>
                      {isMajor && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View>
                      <Text style={[styles.optionLabel, { color: theme.text }]}>Major Event</Text>
                      <Text style={[styles.optionSub, { color: theme.textMuted }]}>{majorMultiplier}x multiplier</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.optionItem} onPress={() => setShowNote(!showNote)} activeOpacity={0.7}>
                    <View style={[styles.noteToggle, { backgroundColor: showNote ? theme.primary + '20' : 'transparent', borderColor: showNote ? theme.primary : theme.divider }]}>
                      <Text style={{ fontSize: 18 }}>📝</Text>
                    </View>
                    <Text style={[styles.optionLabel, { color: theme.text }]}>{showNote ? 'Hide Note' : 'Add Note'}</Text>
                  </TouchableOpacity>

                  {selectedCategory && (
                    <View style={[styles.totalPoints, { backgroundColor: selectedCategory.is_positive ? '#10B981' : '#EF4444' }]}>
                      <Text style={styles.totalPointsText}>{getPointsDisplay()}</Text>
                      <Text style={styles.totalPointsLabel}>pts</Text>
                    </View>
                  )}
                </View>

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

              <View style={{ height: 20 }} />
            </ScrollView>
          </Animated.View>

          <Animated.View style={[styles.fabContainer, { transform: [{ scale: buttonPulse }] }]}>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.9} disabled={!selectedCategory || !selectedPersonId}>
              <LinearGradient
                colors={selectedCategory && selectedPersonId ? [theme.primary, theme.primaryLight] : [theme.textMuted, theme.textMuted]}
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
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 18, color: '#FFF', fontFamily: 'Poppins_600SemiBold' },
  headerTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: -0.3 },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  menuIcon: { fontSize: 20, color: '#FFF', fontFamily: 'Poppins_700Bold' },

  menuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 100 },
  floatingMenu: { position: 'absolute', top: 100, right: 20, width: 220, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 15, zIndex: 101, overflow: 'visible' },
  menuArrow: { position: 'absolute', top: -8, right: 14, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  floatingMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  menuItemIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemIconText: { fontSize: 18 },
  floatingMenuText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', flex: 1 },
  menuItemArrow: { fontSize: 18, fontFamily: 'Poppins_400Regular' },

  content: { flex: 1 },

  stickySection: { paddingHorizontal: 20, marginBottom: 10 },
  stickySectionFirst: { paddingHorizontal: 20, marginBottom: 10, paddingTop: 12 },

  sectionTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 8, letterSpacing: -0.3 },

  // NEW: balloons
  balloonRow: { paddingVertical: 4, gap: 10, flexDirection: 'row' },
  balloonHit: { width: 150 },
  balloonCard: { borderRadius: 16, padding: 12, borderWidth: 1.5 },
  balloonTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', marginBottom: 4, letterSpacing: -0.2 },
  balloonSubtitle: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', lineHeight: 16 },

  personRow: { paddingVertical: 4, gap: 10, flexDirection: 'row' },
  personChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: 50, borderWidth: 1.5, gap: 8 },
  personAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  personInitial: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  personName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', maxWidth: 80 },
  personCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  personCheckText: { color: '#FFF', fontSize: 11, fontFamily: 'Poppins_700Bold' },

  tabContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, left: 4, width: '50%', height: '100%', borderRadius: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', zIndex: 1 },
  tabText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  categoryScroll: { flex: 1 },
  categoryScrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 65 },
  actionList: { gap: 10 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5 },
  actionEmoji: { fontSize: 28, marginRight: 14 },
  actionContent: { flex: 1 },
  actionName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  actionSubtext: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  actionPoints: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 12 },
  actionPointsText: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  actionCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  actionCheckText: { color: '#FFF', fontSize: 14, fontFamily: 'Poppins_700Bold' },

  optionsPanel: { marginTop: 16, padding: 16, borderRadius: 20 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  majorToggle: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#FFF', fontSize: 14, fontFamily: 'Poppins_700Bold' },
  noteToggle: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  optionSub: { fontSize: 11, fontFamily: 'Poppins_400Regular' },

  totalPoints: { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  totalPointsText: { color: '#FFF', fontSize: 20, fontFamily: 'Poppins_700Bold' },
  totalPointsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  noteContainer: { marginTop: 12 },
  noteInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Poppins_400Regular', minHeight: 80, textAlignVertical: 'top' },

  fabContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  fab: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  fabText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins_700Bold', letterSpacing: -0.3 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  emptyImage: { width: 200, height: 200, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 6, textAlign: 'center', letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 15, fontFamily: 'Poppins_500Medium', textAlign: 'center', marginBottom: 26, lineHeight: 22, maxWidth: 260 },
  emptyButton: { borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  emptyButtonGradient: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyButtonText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Poppins_700Bold', letterSpacing: -0.3 },
});
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         