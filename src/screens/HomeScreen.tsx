import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
  Image,
  Animated as RNAnimated,
  PanResponder,
  Modal,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {
  getAllPeople,
  getPersonScore,
  toggleFavorite,
  getPersonTrend,
  getArchivedPeople,
  restorePerson,
} from '../database/db';
import { Person } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { checkSubscription } from '../services/purchases';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type SortOption = 'score-high' | 'score-low' | 'name' | 'recent';

// Defined outside component so FlatList doesn't remount cards on every HomeScreen render
const PersonCard = React.memo(({
  item,
  index,
  isInitialMount,
  theme,
  navigation,
  photoUris,
  onToggleFavorite,
  getHealthColor,
  getHealthGrade,
  getTrendDisplay,
}: {
  item: Person & { score: number; trend: string };
  index: number;
  isInitialMount: boolean;
  theme: any;
  navigation: any;
  photoUris: { [id: number]: string };
  onToggleFavorite: (id: number) => void;
  getHealthColor: (score: number) => string;
  getHealthGrade: (score: number) => string;
  getTrendDisplay: (trend: string) => { arrow: string; text: string; color: string };
}) => {
  const scale = useSharedValue(1);
  const trendDisplay = getTrendDisplay(item.trend);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => { scale.value = withSpring(0.97); };
  const onPressOut = () => { scale.value = withSpring(1); };

  const swipeX = useRef(new RNAnimated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) swipeX.setValue(Math.max(g.dx, -90));
    },
    onPanResponderRelease: (_, g) => {
      RNAnimated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
      if (g.dx < -65) {
        navigation.navigate('LogIncident', { personId: item.id, showBack: true });
      }
    },
    onPanResponderTerminate: () => {
      RNAnimated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
    },
  })).current;

  const color = getHealthColor(item.score);
  const grade = getHealthGrade(item.score);
  const photoUri = photoUris[item.id];

  const HealthRingDisplay = () => {
    if (photoUri) {
      return (
        <View style={{ width: 63, height: 63 }}>
          <Image
            source={{ uri: photoUri }}
            style={{ width: 63, height: 63, borderRadius: 31.5, borderWidth: 3, borderColor: color }}
          />
          <View style={[styles.ringGradeBadge, { backgroundColor: color }]}>
            <Text style={styles.ringGradeBadgeText}>{grade}</Text>
          </View>
        </View>
      );
    }
    const size = 63;
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const progress = (item.score / 100) * circumference;
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgLinearGradient id={`hg${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.backgroundSecondary} strokeWidth="6" fill="none" />
          <Circle cx={size/2} cy={size/2} r={radius} stroke={`url(#hg${item.id})`} strokeWidth="6" fill="none"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringGrade, { color }]}>{grade}</Text>
          <Text style={[styles.ringScore, { color: theme.textMuted }]}>{item.score}</Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      entering={isInitialMount ? FadeInDown.delay(index * 100).duration(400).springify() : undefined}
    >
      <View style={{ overflow: 'hidden', borderRadius: 16, marginHorizontal: 20, marginBottom: 16 }}>
        <RNAnimated.View style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: swipeX.interpolate({ inputRange: [-90, 0], outputRange: [90, 0], extrapolate: 'clamp' }),
          backgroundColor: theme.primary + '20',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 14,
        }}>
          <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
        </RNAnimated.View>
        <RNAnimated.View style={{ transform: [{ translateX: swipeX }] }} {...panResponder.panHandlers}>
          <AnimatedTouchable
            style={[styles.personCard, animatedStyle]}
            onPress={() => navigation.navigate('PersonDetail', { personId: item.id })}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
          >
            <View style={[styles.cardWrapper, { backgroundColor: theme.card }]}>
              <View style={[styles.cardInner, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardContent}>
                  <HealthRingDisplay />
                  <View style={styles.personInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => onToggleFavorite(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={[styles.favoriteIcon, { color: theme.primary }]}>
                          {item.is_favorite ? '★' : '☆'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.relationshipBadge, { backgroundColor: theme.primary + '15' }]}>
                      <Text style={[styles.relationshipType, { color: theme.primary }]}>
                        {item.relationship_type}
                      </Text>
                    </View>
                    <View style={styles.trendContainer}>
                      <Text style={[styles.trendArrow, { color: trendDisplay.color }]}>{trendDisplay.arrow}</Text>
                      <Text style={[styles.trendText, { color: trendDisplay.color }]}>{trendDisplay.text}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </AnimatedTouchable>
        </RNAnimated.View>
      </View>
    </Animated.View>
  );
});

// Limits
const FREE_PEOPLE_LIMIT = 5;
const PREMIUM_PEOPLE_LIMIT = 50;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [people, setPeople] = useState<(Person & { score: number; trend: string })[]>([]);
  const [peopleQuery, setPeopleQuery] = useState<{ q: string; sort: SortOption }>({
    q: '',
    sort: 'score-high',
  });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [archivedPeople, setArchivedPeople] = useState<Person[]>([]);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [photoUris, setPhotoUris] = useState<{ [id: number]: string }>({});

  const isInitialMount = useRef(true);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [controlsPillLayout, setControlsPillLayout] = useState({ y: 0, height: 0 });

  const loadPeople = useCallback(() => {
    try {
      const peopleData = getAllPeople() as Person[];
      const peopleWithScores = peopleData.map(person => ({
        ...person,
        score: getPersonScore(person.id),
        trend: getPersonTrend(person.id),
      }));

      if (isMountedRef.current) {
        setPeople(peopleWithScores);
        setArchivedPeople(getArchivedPeople() as Person[]);
      }

      const PHOTO_DIR = `${FileSystem.documentDirectory}photos/`;
      Promise.all(peopleData.map(async (p) => {
        const path = `${PHOTO_DIR}${p.id}.jpg`;
        const info = await FileSystem.getInfoAsync(path);
        return info.exists ? [p.id, path] : null;
      })).then(results => {
        const uris: { [id: number]: string } = {};
        results.forEach(r => { if (r) uris[r[0] as number] = r[1] as string; });
        if (isMountedRef.current) setPhotoUris(uris);
      });
    } catch (error) {
      console.error('Error loading people:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load people. Please try again.');
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      isInitialMount.current = true;

      loadPeople();

      const checkPremiumStatus = async () => {
        try {
          const premium = await checkSubscription();
          if (isMountedRef.current) {
            setIsPremium(premium);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          if (isMountedRef.current) {
            setIsPremium(false);
          }
        }
      };
      checkPremiumStatus();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          isInitialMount.current = false;
        }
      }, 500);

      return () => {
        isMountedRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [loadPeople])
  );

  const handleToggleFavorite = (personId: number) => {
    try {
      toggleFavorite(personId);
      loadPeople();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleAddPerson = () => {
    const currentLimit = isPremium ? PREMIUM_PEOPLE_LIMIT : FREE_PEOPLE_LIMIT;

    if (people.length >= currentLimit) {
      if (isPremium) {
        Alert.alert(
          'Limit Reached',
          `You've reached the maximum of ${PREMIUM_PEOPLE_LIMIT} people. Consider removing inactive relationships to add new ones.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Free Limit Reached',
          `You can track up to ${FREE_PEOPLE_LIMIT} people on the free plan. Upgrade to Premium to track up to ${PREMIUM_PEOPLE_LIMIT} people.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade',
              onPress: () =>
                (navigation as any).getParent()?.navigate('Settings', {
                  screen: 'Paywall',
                }),
            },
          ]
        );
      }
      return;
    }

    (navigation as any).navigate('AddPerson');
  };


  const getFilteredAndSortedPeople = () => {
    let filtered = people;

    const q = peopleQuery.q.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    let sorted = [...filtered];
    switch (peopleQuery.sort) {
      case 'score-high':
        sorted.sort((a, b) => b.score - a.score);
        break;
      case 'score-low':
        sorted.sort((a, b) => a.score - b.score);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        sorted.sort((a, b) => b.id - a.id);
        break;
    }

    return sorted.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
  };


  const filteredPeople = getFilteredAndSortedPeople();

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#22C55E';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#F97316';
    return '#EF4444';
  };

  const getHealthGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  };

  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { arrow: '↗', text: 'Improving', color: '#10B981' };
      case 'declining':
        return { arrow: '↘', text: 'Declining', color: '#EF4444' };
      case 'stable':
        return { arrow: '→', text: 'Stable', color: '#6B7280' };
      case 'new':
        return { arrow: '•', text: 'New', color: '#6B7280' };
      default:
        return { arrow: '→', text: 'Stable', color: '#6B7280' };
    }
  };


  const getSortLabel = () => {
    switch (peopleQuery.sort) {
      case 'score-high':
        return 'Highest Score';
      case 'score-low':
        return 'Lowest Score';
      case 'name':
        return 'Name (A-Z)';
      case 'recent':
        return 'Recently Added';
    }
  };

  const currentLimit = isPremium ? PREMIUM_PEOPLE_LIMIT : FREE_PEOPLE_LIMIT;
  const isAtLimit = people.length >= currentLimit;

  // NEW: Dashboard stats
  const avgScore =
    people.length > 0
      ? Math.round(people.reduce((sum, p) => sum + p.score, 0) / people.length)
      : 0;
  const favoritesCount = people.filter(p => p.is_favorite).length;
  const atRiskCount = people.filter(p => p.score < 40).length;


  return (
    <LinearGradient
      colors={[theme.background, theme.backgroundSecondary]}
      style={styles.container}
    >
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      {showSortMenu && (
        <Pressable
          style={styles.sortMenuOverlay}
          onPress={() => setShowSortMenu(false)}
        />
      )}

      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.headerTitle}>Logifyer</Text>
              </View>

              <Text style={styles.headerSubtitle}>
                {people.length}/{currentLimit} {people.length === 1 ? 'person' : 'people'} tracked
                {!isPremium && people.length === FREE_PEOPLE_LIMIT && (
                  <Text style={styles.limitWarning}> • Limit reached</Text>
                )}
                {!isPremium && people.length === FREE_PEOPLE_LIMIT - 1 && (
                  <Text style={styles.limitWarning}> • Near limit</Text>
                )}
                {isPremium && people.length === PREMIUM_PEOPLE_LIMIT && (
                  <Text style={styles.limitWarning}> • Limit reached</Text>
                )}
              </Text>
            </View>

            <View style={styles.headerRight}>

              <TouchableOpacity
                style={[styles.settingsButton, { backgroundColor: theme.headerOverlay }]}
                onPress={() =>
                  (navigation as any).navigate('Settings', {
                    screen: 'SettingsMain',
                  })
                }
              >
                <Ionicons name="menu-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {people.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <Image
              source={require('../../assets/logi1234.png')}
              style={styles.emptyImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Track your relationships
          </Text>

          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Log how people treat you. Logifyer tracks patterns and shows your real relationship health.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddPerson}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>Add Person</Text>
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>
      ) : (
        <>
          {/* NEW: Dashboard ABOVE search bar */}
          <View style={styles.dashboardWrap}>
            <View style={[styles.dashboard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.dashboardTopRow}>
  <View>
    <Text style={[styles.dashboardTitle, { color: theme.text }]}>Dashboard</Text>
  </View>

</View>


              <View style={styles.dashboardCards}>
                <View style={[styles.dashCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[styles.dashCardLabel, { color: theme.textMuted }]}>Avg Score</Text>
                  <Text style={[styles.dashCardValue, { color: theme.text }]}>{avgScore}</Text>
                </View>

                <View style={[styles.dashCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[styles.dashCardLabel, { color: theme.textMuted }]}>Favorites</Text>
                  <Text style={[styles.dashCardValue, { color: theme.text }]}>{favoritesCount}</Text>
                </View>

                <View style={[styles.dashCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[styles.dashCardLabel, { color: theme.textMuted }]}>At Risk</Text>
                  <Text style={[styles.dashCardValue, { color: theme.text }]}>{atRiskCount}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Controls (merged search + sort) */}
            <View style={styles.controlsContainer}>
              <View
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  setControlsPillLayout({ y, height });
                }}
                style={[
                  styles.controlsPill,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginLeft: 12 }} />

                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search people..."
                  placeholderTextColor={theme.textMuted}
                  value={peopleQuery.q}
                  onChangeText={(t) => setPeopleQuery(p => ({ ...p, q: t }))}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"   
                />

                <View style={[styles.controlsDivider, { backgroundColor: theme.divider }]} />

                <TouchableOpacity
                  style={styles.sortPillBtn}
                  onPress={() => setShowSortMenu(!showSortMenu)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.sortPillText, { color: theme.text }]}>
                    {getSortLabel()}
                  </Text>
                  <Text style={[styles.sortArrow, { color: theme.textMuted }]}>▼</Text>
                </TouchableOpacity>
              </View>

              {showSortMenu && (
                <View
                  style={[
                    styles.sortMenu,
                    { backgroundColor: theme.card },
                    { top: controlsPillLayout.y + controlsPillLayout.height + 8 },
                  ]}
                >
                  {peopleQuery.sort !== 'score-high' && (
                    <TouchableOpacity
                      style={[styles.sortOption, { borderBottomColor: theme.divider }]}
                      onPress={() => {
                        setPeopleQuery(p => ({ ...p, sort: 'score-high' }));
                        setShowSortMenu(false);
                      }}
                    >
                      <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>
                        Highest Score
                      </Text>
                    </TouchableOpacity>
                  )}

                  {peopleQuery.sort !== 'score-low' && (
                    <TouchableOpacity
                      style={[styles.sortOption, { borderBottomColor: theme.divider }]}
                      onPress={() => {
                        setPeopleQuery(p => ({ ...p, sort: 'score-low' }));
                        setShowSortMenu(false);
                      }}
                    >
                      <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>
                        Lowest Score
                      </Text>
                    </TouchableOpacity>
                  )}

                  {peopleQuery.sort !== 'name' && (
                    <TouchableOpacity
                      style={[styles.sortOption, { borderBottomColor: theme.divider }]}
                      onPress={() => {
                        setPeopleQuery(p => ({ ...p, sort: 'name' }));
                        setShowSortMenu(false);
                      }}
                    >
                      <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>
                        Name (A-Z)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {peopleQuery.sort !== 'recent' && (
                    <TouchableOpacity
                      style={[styles.sortOption, styles.sortOptionLast]}
                      onPress={() => {
                        setPeopleQuery(p => ({ ...p, sort: 'recent' }));
                        setShowSortMenu(false);
                      }}
                    >
                      <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>
                        Recently Added
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>


          <FlatList
            data={filteredPeople}
            renderItem={({ item, index }) => (
              <PersonCard
                item={item}
                index={index}
                isInitialMount={isInitialMount.current}
                theme={theme}
                navigation={navigation}
                photoUris={photoUris}
                onToggleFavorite={handleToggleFavorite}
                getHealthColor={getHealthColor}
                getHealthGrade={getHealthGrade}
                getTrendDisplay={getTrendDisplay}
              />
            )}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={() =>
              peopleQuery.q ? (
                <View style={styles.emptySearchState}>
                  <Ionicons name="search-outline" size={40} color={theme.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptySearchText, { color: theme.textMuted }]}>
                    No people found for "{peopleQuery.q}"
                  </Text>
                </View>
              ) : null
            }
          />

          <TouchableOpacity
            style={[styles.fab, isAtLimit && styles.fabDisabled]}
            onPress={handleAddPerson}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isAtLimit ? ['#9CA3AF', '#6B7280'] : [theme.primary, theme.primaryLight]}
              style={styles.fabGradient}
            >
              <Text style={styles.fabText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>

        </>
      )}

      {archivedPeople.length > 0 && (
        <TouchableOpacity
          style={styles.archivedRow}
          onPress={() => setShowArchivedModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="archive-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.archivedRowText, { color: theme.textMuted }]}>
            {archivedPeople.length} archived
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showArchivedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowArchivedModal(false)}
      >
        <Pressable style={styles.archivedModalOverlay} onPress={() => setShowArchivedModal(false)}>
          <Pressable style={[styles.archivedModalSheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.archivedModalHandle, { backgroundColor: theme.divider }]} />
            <Text style={[styles.archivedModalTitle, { color: theme.text }]}>Archived People</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
            {archivedPeople.map((person) => (
              <View key={person.id} style={[styles.archivedPersonRow, { borderBottomColor: theme.divider }]}>
                <View style={[styles.archivedAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.archivedAvatarText, { color: theme.primary }]}>
                    {person.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.archivedPersonInfo}>
                  <Text style={[styles.archivedPersonName, { color: theme.text }]}>{person.name}</Text>
                  <Text style={[styles.archivedPersonType, { color: theme.textMuted }]}>{person.relationship_type}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.restoreButton, { backgroundColor: theme.primary + '15' }]}
                  onPress={() => {
                    restorePerson(person.id);
                    loadPeople();
                    if (archivedPeople.length === 1) setShowArchivedModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.restoreButtonText, { color: theme.primary }]}>Restore</Text>
                </TouchableOpacity>
              </View>
            ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 24,
  },
  headerContent: {},
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Poppins_500Medium',
  },
  limitWarning: {
    color: '#FCD34D',
    fontFamily: 'Poppins_600SemiBold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // NEW: header +log
  newLogButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  newLogButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },

  // NEW: Dashboard
  dashboardWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
  },
  dashboard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dashboardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  dashboardLogBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  dashboardLogBtnGrad: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardLogBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  dashboardCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dashCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
  },
  dashCardLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
  },
  dashCardValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },

  controlsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  sortButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  sortArrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  sortMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  sortMenu: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 9999,
    zIndex: 10000,
  },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sortOptionLast: {
    borderBottomWidth: 0,
  },
  sortOptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 140,
  },
  personCard: {},
  cardWrapper: {
    borderRadius: 20,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  cardInner: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGrade: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  ringScore: {
    fontSize: 13,
    marginTop: -5,
    fontFamily: 'Poppins_600SemiBold',
  },
  ringGradeBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGradeBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    color: '#FFF',
  },

  personInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  personName: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.3,
    flex: 1,
  },
  favoriteIcon: { fontSize: 22 },
  relationshipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  relationshipType: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendArrow: { fontSize: 16 },
  trendText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 22,
    maxWidth: 260,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.3,
  },

  emptySearchState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptySearchText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    borderRadius: 30,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabDisabled: {
    shadowColor: '#6B7280',
    shadowOpacity: 0.2,
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
    fontFamily: 'Poppins_400Regular',
  },

  // NEW: Balloon picker sheet
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 20000,
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    zIndex: 30000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  sheetHeader: { marginBottom: 14 },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  balloonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  balloonHit: {
    width: '48%',
  },
  balloonCard: {
    borderRadius: 18,
    padding: 12,
    minHeight: 90,
    justifyContent: 'center',
  },
  balloonEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  balloonTitle: {
    color: '#111827',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  balloonSubtitle: {
    color: 'rgba(17,24,39,0.75)',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 16,
  },
  sheetCancel: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  dashboardTopRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},
dashboardStreakPill: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: 'rgba(0,0,0,0.06)',
},
dashboardStreakEmoji: { fontSize: 14 },
dashboardStreakText: {
  marginLeft: 6,
  fontSize: 14,
  fontFamily: 'Poppins_700Bold',
  letterSpacing: -0.2,
},
archivedRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 20,
},
archivedRowText: {
  fontSize: 13,
  fontFamily: 'Poppins_500Medium',
},
archivedModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
archivedModalSheet: {
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 20,
  paddingBottom: 40,
  maxHeight: '70%',
},
archivedModalHandle: {
  width: 40,
  height: 4,
  borderRadius: 2,
  alignSelf: 'center',
  marginBottom: 16,
},
archivedModalTitle: {
  fontSize: 18,
  fontFamily: 'Poppins_700Bold',
  marginBottom: 16,
},
archivedPersonRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  gap: 12,
},
archivedAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
},
archivedAvatarText: {
  fontSize: 16,
  fontFamily: 'Poppins_700Bold',
},
archivedPersonInfo: {
  flex: 1,
},
archivedPersonName: {
  fontSize: 15,
  fontFamily: 'Poppins_600SemiBold',
},
archivedPersonType: {
  fontSize: 12,
  fontFamily: 'Poppins_400Regular',
  marginTop: 2,
},
restoreButton: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 10,
},
restoreButtonText: {
  fontSize: 13,
  fontFamily: 'Poppins_600SemiBold',
},
controlsPill: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderWidth: 1,
},
controlsDivider: {
  width: 1,
  height: 22,
  marginHorizontal: 10,
  borderRadius: 1,
},
sortPillBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
sortPillText: {
  fontSize: 14,
  fontFamily: 'Poppins_600SemiBold',
},


});
