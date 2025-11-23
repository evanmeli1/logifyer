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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type SortOption = 'score-high' | 'score-low' | 'name' | 'recent';

export default function HomeScreen() {
  const navigation = useNavigation();
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
            stroke="#F3F4F6"
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
          <Text style={styles.ringScore}>{score}</Text>
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
          onPress={() => (navigation as any).navigate('Home', { 
            screen: 'PersonDetail', 
            params: { personId: item.id } 
          })}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
        >
          <View style={styles.cardWrapper}>
            <View style={styles.cardInner}>
              <View style={styles.cardContent}>
                <HealthRing score={item.score} size={68} />
                
                <View style={styles.personInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <TouchableOpacity 
                      onPress={() => handleToggleFavorite(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.favoriteIcon}>
                        {item.is_favorite ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.relationshipBadge}>
                    <Text style={styles.relationshipType}>{item.relationship_type}</Text>
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
      colors={['#F9FAFB', '#F3F4F6']}
      style={styles.container}
    >
      <LinearGradient
        colors={['#F43F5E', '#FB7185']}
        style={styles.header}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Logifyer</Text>
              <Text style={styles.headerSubtitle}>{people.length} {people.length === 1 ? 'person' : 'people'} tracked</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
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
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
          </View>
          <Text style={styles.emptyTitle}>Start tracking relationships</Text>
          <Text style={styles.emptySubtitle}>Add your first person to begin monitoring relationship health</Text>
          
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => (navigation as any).navigate('Home', { screen: 'AddPerson' })}
          >
            <LinearGradient
              colors={['#F43F5E', '#FB923C']}
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
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search people..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
              <Text style={styles.sortArrow}>▼</Text>
            </TouchableOpacity>

            {showSortMenu && (
              <View style={styles.sortMenu}>
                {sortBy !== 'score-high' && (
                  <TouchableOpacity 
                    style={styles.sortOption}
                    onPress={() => { setSortBy('score-high'); setShowSortMenu(false); }}
                  >
                    <Text style={styles.sortOptionText}>Highest Score</Text>
                  </TouchableOpacity>
                )}
                {sortBy !== 'score-low' && (
                  <TouchableOpacity 
                    style={styles.sortOption}
                    onPress={() => { setSortBy('score-low'); setShowSortMenu(false); }}
                  >
                    <Text style={styles.sortOptionText}>Lowest Score</Text>
                  </TouchableOpacity>
                )}
                {sortBy !== 'name' && (
                  <TouchableOpacity 
                    style={styles.sortOption}
                    onPress={() => { setSortBy('name'); setShowSortMenu(false); }}
                  >
                    <Text style={styles.sortOptionText}>Name (A-Z)</Text>
                  </TouchableOpacity>
                )}
                {sortBy !== 'recent' && (
                  <TouchableOpacity 
                    style={[styles.sortOption, styles.sortOptionLast]}
                    onPress={() => { setSortBy('recent'); setShowSortMenu(false); }}
                  >
                    <Text style={styles.sortOptionText}>Recently Added</Text>
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
            onPress={() => (navigation as any).navigate('Home', { screen: 'AddPerson' })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F43F5E', '#FB923C']}
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
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  settingsButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.08)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.08)',
  },
  sortButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sortArrow: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
  },
  sortOptionLast: {
    borderBottomWidth: 0,
  },
  sortOptionText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  cardInner: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.08)',
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
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  ringScore: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: -1,
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 24,
    color: '#F43F5E',
  },
  relationshipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  relationshipType: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
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
    fontWeight: '600',
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
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
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
    fontWeight: '700',
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
    fontWeight: '300',
  },
});