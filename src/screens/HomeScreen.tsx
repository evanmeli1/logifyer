import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { 
  FadeInDown,
  FadeIn,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { getAllPeople, getPersonScore, toggleFavorite } from '../database/db';
import { Person } from '../types';
import { useTheme } from '../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type SortOption = 'score-high' | 'score-low' | 'name' | 'recent';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [people, setPeople] = useState<(Person & { score: number })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('score-high');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const isInitialMount = React.useRef(true);

  const loadPeople = useCallback(() => {
    const peopleData = getAllPeople() as Person[];
    const peopleWithScores = peopleData.map(person => ({
      ...person,
      score: getPersonScore(person.id),
    }));
    setPeople(peopleWithScores);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPeople();
      if (isInitialMount.current) {
        setTimeout(() => {
          isInitialMount.current = false;
        }, 500);
      }
    }, [loadPeople])
  );

  const handleToggleFavorite = (personId: number) => {
    toggleFavorite(personId);
    loadPeople();
  };

  const getFilteredAndSortedPeople = () => {
    let filtered = people;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    let sorted = [...filtered];
    switch (sortBy) {
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

    // Favorites first
    return sorted.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
  };

  const filteredPeople = getFilteredAndSortedPeople();

  const getHealthColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 80) return '#84CC16';
    if (score >= 70) return '#FBBF24';
    if (score >= 60) return '#F97316';
    return '#EF4444';
  };

  const getHealthGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const HealthRing = ({ score, size = 80 }: { score: number; size?: number }) => {
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = getHealthColor(score);

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgLinearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.backgroundSecondary}
            strokeWidth="6"
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#healthGradient)"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringGrade, { color }]}>{getHealthGrade(score)}</Text>
          <Text style={[styles.ringScore, { color: theme.textMuted }]}>{score}</Text>
        </View>
      </View>
    );
  };

  const PersonCard = ({ item, index }: { item: Person & { score: number }; index: number }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const onPressIn = () => {
      scale.value = withSpring(0.97);
    };

    const onPressOut = () => {
      scale.value = withSpring(1);
    };

    return (
      <Animated.View 
        entering={isInitialMount.current ? FadeInDown.delay(index * 100).duration(400).springify() : undefined}
      >
        <AnimatedTouchable
          style={[styles.personCard, animatedStyle]}
          onPress={() => (navigation as any).navigate('PersonDetail', { personId: item.id })}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
        >
          <View style={[styles.cardWrapper, { backgroundColor: theme.card }]}>
            <View style={[styles.cardInner, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardContent}>
                <HealthRing score={item.score} size={68} />
                
                <View style={styles.personInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.personName, { color: theme.text }]}>{item.name}</Text>
                    <TouchableOpacity 
                      onPress={() => handleToggleFavorite(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={[styles.favoriteIcon, { color: theme.primary }]}>
                        {item.is_favorite ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.relationshipBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.relationshipType, { color: theme.primary }]}>{item.relationship_type}</Text>
                  </View>
                  <View style={styles.trendContainer}>
                    <Text style={styles.trendArrow}>↗</Text>
                    <Text style={styles.trendText}>Improving</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </AnimatedTouchable>
      </Animated.View>
    );
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'score-high': return 'Highest Score';
      case 'score-low': return 'Lowest Score';
      case 'name': return 'Name (A-Z)';
      case 'recent': return 'Recently Added';
    }
  };

  return (
    <LinearGradient
      colors={[theme.background, theme.backgroundSecondary]}
      style={styles.container}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Logifyer</Text>
              <Text style={styles.headerSubtitle}>{people.length} {people.length === 1 ? 'person' : 'people'} tracked</Text>
            </View>
            <TouchableOpacity 
              style={[styles.settingsButton, { backgroundColor: theme.headerOverlay }]}
              onPress={() => (navigation as any).navigate('Settings', { screen: 'SettingsMain' })}
            >
              <View style={styles.settingsIconContainer}>
                <View style={styles.settingsDot} />
                <View style={styles.settingsDot} />
                <View style={styles.settingsDot} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {people.length === 0 ? (
        <Animated.View 
          entering={FadeIn.delay(200)}
          style={styles.emptyState}
        >
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '15' }]}>
            <Text style={styles.emptyIcon}>👥</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Start tracking relationships</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>Add your first person to begin monitoring relationship health</Text>
          
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => (navigation as any).navigate('AddPerson')}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.emptyButtonText}>+ Add Person</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <>
          {/* Search & Sort Bar */}
          <View style={styles.controlsContainer}>
            <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search people..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.sortButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <Text style={[styles.sortButtonText, { color: theme.text }]}>{getSortLabel()}</Text>
              <Text style={[styles.sortArrow, { color: theme.textMuted }]}>▼</Text>
            </TouchableOpacity>

            {showSortMenu && (
              <View style={[styles.sortMenu, { backgroundColor: theme.card }]}>
                {sortBy !== 'score-high' && (
                  <TouchableOpacity 
                    style={[styles.sortOption, { borderBottomColor: theme.divider }]}
                    onPress={() => { setSortBy('score-high'); setShowSortMenu(false); }}
                  >
                    <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>Highest Score</Text>
                  </TouchableOpacity>
                )}
                {sortBy !== 'score-low' && (
                  <TouchableOpacity 
                    style={[styles.sortOption, { borderBottomColor: theme.divider }]}
                    onPress={() => { setSortBy('score-low'); setShowSortMenu(false); }}
                  >
                    <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>Lowest Score</Text>
                  </TouchableOpacity>
                )}
                {sortBy !== 'name' && (
                  <TouchableOpacity 
                    style={[styles.sortOption, { borderBottomColor: theme.divider }]}
                    onPress={() => { setSortBy('name'); setShowSortMenu(false); }}
                  >
                    <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>Name (A-Z)</Text>
                  </TouchableOpacity>
                )}
                {sortBy !== 'recent' && (
                  <TouchableOpacity 
                    style={[styles.sortOption, styles.sortOptionLast]}
                    onPress={() => { setSortBy('recent'); setShowSortMenu(false); }}
                  >
                    <Text style={[styles.sortOptionText, { color: theme.textMuted }]}>Recently Added</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <FlatList
            data={filteredPeople}
            renderItem={({ item, index }) => <PersonCard item={item} index={index} />}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          <TouchableOpacity 
            style={styles.fab}
            onPress={() => (navigation as any).navigate('AddPerson')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryLight]}
              style={styles.fabGradient}
            >
              <Text style={styles.fabText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  headerContent: {},
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Inter_500Medium',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  settingsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  sortArrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 9999,
    zIndex: 9999,
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
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  personCard: {
    marginBottom: 16,
  },
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
    alignItems: 'center',
    gap: 18,
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
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  ringScore: {
    fontSize: 13,
    marginTop: -1,
    fontFamily: 'Inter_600SemiBold',
  },
  personInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  personName: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.3,
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  relationshipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  relationshipType: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendArrow: {
    fontSize: 16,
  },
  trendText: {
    fontSize: 14,
    color: '#059669',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 36,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  gradientButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
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
});