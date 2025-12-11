import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal,
  ScrollView, TextInput, Pressable, Dimensions, Image, ActionSheetIOS, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  getPersonById, getIncidentsByPerson, getPersonScore, deleteIncident, deletePerson, 
  resetPersonScore, getAllRelationshipTypes, checkPersonNameExists, getDatabase,
} from '../database/db';
import { Person } from '../types';
import { generatePersonInsights, AIInsightsResult } from '../services/ai';
import { useTheme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { checkSubscription } from '../services/purchases';

const PHOTO_DIR = `${FileSystem.documentDirectory}photos/`;

interface RelationshipType {
  id: number;
  type: string;
  emoji: string;
  is_custom: number;
}

export default function PersonDetailScreen({ route }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);  
  const { personId } = route.params || {};
  const navigation = useNavigation();
  const [person, setPerson] = useState<Person | null>(null);
  const [score, setScore] = useState(0);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);

  const openMenu = () => {
    setMenuVisible(true);
    menuScale.value = withTiming(1, { duration: 200 });
    menuOpacity.value = withTiming(1, { duration: 150 });
  };

  const closeMenu = () => {
    menuScale.value = withSpring(0, { damping: 20, stiffness: 400 });
    menuOpacity.value = withTiming(0, { duration: 100 });
    setTimeout(() => setMenuVisible(false), 150);
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }, { translateY: (1 - menuScale.value) * -20 }],
    opacity: menuOpacity.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value * 0.3,
  }));

  const ensurePhotoDir = async () => {
    const dirInfo = await FileSystem.getInfoAsync(PHOTO_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
    }
  };

  const loadPhoto = async () => {
    try {
      const photoPath = `${PHOTO_DIR}${personId}.jpg`;
      const photoInfo = await FileSystem.getInfoAsync(photoPath);
      if (photoInfo.exists) {
        setPhotoUri(photoPath);
      } else {
        setPhotoUri(null);
      }
    } catch (error) {
      setPhotoUri(null);
    }
  };

  const savePhoto = async (uri: string) => {
    try {
      await ensurePhotoDir();
      const photoPath = `${PHOTO_DIR}${personId}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: photoPath });
      setPhotoUri(photoPath + '?' + Date.now());
    } catch (error) {
      console.log('Save photo error:', error);
      Alert.alert('Error', `Failed to save photo: ${JSON.stringify(error)}`);
    }
  };

  const removePhoto = async () => {
    try {
      const photoPath = `${PHOTO_DIR}${personId}.jpg`;
      const photoInfo = await FileSystem.getInfoAsync(photoPath);
      if (photoInfo.exists) {
        await FileSystem.deleteAsync(photoPath);
      }
      setPhotoUri(null);
    } catch (error) {
      console.log('Error removing photo:', error);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      const options = photoUri 
        ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
        : ['Take Photo', 'Choose from Library', 'Cancel'];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: photoUri ? 2 : undefined,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) await pickImage('camera');
          else if (buttonIndex === 1) await pickImage('library');
          else if (buttonIndex === 2 && photoUri) removePhoto();
        }
      );
    } else {
      const buttons: any[] = [
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Library', onPress: () => pickImage('library') },
      ];
      if (photoUri) buttons.push({ text: 'Remove Photo', onPress: removePhoto, style: 'destructive' });
      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Profile Photo', 'Choose an option', buttons);
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to choose photos.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        await savePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const loadData = useCallback(() => {
    const personData = getPersonById(personId) as Person;
    const incidentsData = getIncidentsByPerson(personId);
    const currentScore = getPersonScore(personId);
    setPerson(personData);
    setIncidents(incidentsData);
    setScore(currentScore);
  }, [personId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadPhoto();
      try {
        const types = getAllRelationshipTypes() as RelationshipType[];
        setRelationshipTypes(types);
      } catch (e) {}
      
      const checkPremiumStatus = async () => {
        try {
          const premium = await checkSubscription();
          setIsPremium(premium);
        } catch (error) {
          setIsPremium(false);
        }
      };
      checkPremiumStatus();
    }, [loadData])
  );

  const openEditModal = () => {
    if (person) {
      setEditName(person.name);
      setEditRelationship(person.relationship_type);
    }
    closeMenu();
    setTimeout(() => setShowEditModal(true), 200);
  };

  const handleSaveEdit = () => {
    if (!person) return;
    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }
    if (trimmedName.toLowerCase() !== person.name.toLowerCase() && checkPersonNameExists(trimmedName)) {
      Alert.alert('Error', 'A person with this name already exists');
      return;
    }
    const db = getDatabase();
    db.runSync('UPDATE people SET name = ?, relationship_type = ? WHERE id = ?', [trimmedName, editRelationship, personId]);
    setShowEditModal(false);
    loadData();
  };

  const isEditValid = () => {
    const trimmedName = editName.trim();
    if (trimmedName.length < 2) return false;
    if (trimmedName.toLowerCase() !== person?.name.toLowerCase() && checkPersonNameExists(trimmedName)) return false;
    return true;
  };

  const handleResetScore = () => {
    closeMenu();
    setTimeout(() => {
      Alert.alert('Reset Score', `Delete all incidents for ${person?.name}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { resetPersonScore(personId); loadData(); } },
      ]);
    }, 200);
  };

  const handleDelete = () => {
    closeMenu();
    setTimeout(() => {
      Alert.alert('Delete Person', `Permanently delete ${person?.name} and all their incidents?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt('Confirm Delete', 'Type DELETE to confirm', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async (text?: string) => {
                  if (text === 'DELETE') {
                    await removePhoto();
                    deletePerson(personId);
                    navigation.goBack();
                  } else {
                    Alert.alert('Error', 'You must type DELETE to confirm');
                  }
                },
              },
            ], 'plain-text');
          },
        },
      ]);
    }, 200);
  };

  const handleGenerateInsights = async (forceRegenerate: boolean = false) => {
    if (!user) {
      Alert.alert('Sign In Required', 'You need to sign in to use AI Insights.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => (navigation as any).navigate('Settings', { screen: 'SignIn' }) },
      ]);
      return;
    }
    if (!isPremium) {
      Alert.alert('Premium Feature', 'AI Insights is a premium feature. Upgrade to unlock personalized relationship analysis.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => (navigation as any).getParent()?.navigate('Settings', { screen: 'Paywall' }) },
      ]);
      return;
    }
    if (incidents.length === 0) {
      Alert.alert('No Data', 'Add some incidents first to generate insights.');
      return;
    }
    setLoadingInsights(true);
    try {
      const insights = await generatePersonInsights(personId, person!.name, incidents, score, forceRegenerate);
      setAiInsights(insights);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate insights. Check your API key and internet connection.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const getHealthGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: '#10B981', bg: '#10B98115' };
    if (score >= 60) return { grade: 'B', color: '#22C55E', bg: '#22C55E15' };
    if (score >= 40) return { grade: 'C', color: '#F59E0B', bg: '#F59E0B15' };
    if (score >= 20) return { grade: 'D', color: '#F97316', bg: '#F9731615' };
    return { grade: 'F', color: '#EF4444', bg: '#EF444415' };
  };

  const handleDeleteIncident = (incidentId: number) => {
    Alert.alert('Delete Incident', 'Are you sure you want to delete this incident?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteIncident(incidentId); loadData(); } },
    ]);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };


  const toggleSelection = (incidentId: number) => {
    if (selectedIncidents.includes(incidentId)) {
      setSelectedIncidents(selectedIncidents.filter(id => id !== incidentId));
    } else {
      setSelectedIncidents([...selectedIncidents, incidentId]);
    }
  };

  const handleBulkDelete = () => {
    Alert.alert('Delete Incidents', `Delete ${selectedIncidents.length} incidents?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          selectedIncidents.forEach(id => deleteIncident(id));
          setSelectedIncidents([]);
          setSelectionMode(false);
          loadData();
        },
      },
    ]);
  };

  const getRelationshipEmoji = (type: string) => {
    const found = relationshipTypes.find(r => r.type === type);
    return found?.emoji || '👤';
  };

  const renderIncident = ({ item }: any) => {
    const isMajor = item.is_major === 1;
    const isPositive = item.points > 0;
    const isSelected = selectedIncidents.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.incidentCard,
          { backgroundColor: theme.card },
          isSelected && { backgroundColor: theme.primary + '15', borderColor: theme.primary, borderWidth: 1.5 }
        ]}
        onPress={() => { if (selectionMode) toggleSelection(item.id); }}
        onLongPress={() => { if (!selectionMode) handleDeleteIncident(item.id); }}
        activeOpacity={0.7}
      >
        {selectionMode && (
          <View style={[styles.checkbox, { borderColor: theme.primary }, isSelected && { backgroundColor: theme.primary }]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <View style={styles.incidentContent}>
          <View style={styles.incidentHeader}>
            <View style={styles.incidentTitleRow}>
              <View style={[styles.emojiContainer, { backgroundColor: isPositive ? '#10B98112' : '#EF444412' }]}>
                <Text style={styles.incidentEmoji}>{item.category_emoji}</Text>
              </View>
              <View style={styles.incidentInfo}>
                <Text style={[styles.incidentName, { color: theme.text }]}>{item.category_name}</Text>
                <Text style={[styles.incidentTime, { color: theme.textMuted }]}>{formatDate(item.timestamp)}</Text>
              </View>
            </View>
            <View style={styles.pointsContainer}>
              {isMajor && (
                <View style={[styles.majorBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.majorBadgeText}>MAJOR</Text>
                </View>
              )}
              <Text style={[styles.incidentPoints, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                {item.points > 0 ? '+' : ''}{item.points}
              </Text>
            </View>
          </View>
          {item.note && <Text style={[styles.incidentNote, { color: theme.textMuted }]}>{item.note}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (!person) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  const health = getHealthGrade(score);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[theme.primary, theme.primaryLight]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.avatarTouchable}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.relationshipPill}>
            <Text style={styles.relationshipEmoji}>{getRelationshipEmoji(person.relationship_type)}</Text>
            <Text style={styles.relationshipType}>{person.relationship_type}</Text>
          </View>

          <Text style={styles.personName}>{person.name}</Text>
          
          <View style={styles.scoreCard}>
            <View style={styles.scoreSection}>
              <Text style={[styles.scoreNumber, { color: health.color }]}>{score}</Text>
              <Text style={styles.scoreSectionLabel}>Score</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreSection}>
              <View style={[styles.gradeBadge, { backgroundColor: health.color }]}>
                <Text style={styles.gradeText}>{health.grade}</Text>
              </View>
              <Text style={styles.scoreSectionLabel}>Grade</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </LinearGradient>

      {menuVisible && (
        <>
          <Animated.View style={[styles.menuOverlayBg, overlayAnimatedStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          </Animated.View>
          
          <Animated.View style={[styles.floatingMenu, { backgroundColor: theme.card }, menuAnimatedStyle]}>
            <View style={[styles.menuArrow, { borderBottomColor: theme.card }]} />
            
            <TouchableOpacity style={[styles.floatingMenuItem, { borderBottomColor: theme.divider }]} onPress={openEditModal} activeOpacity={0.7}>
              <View style={[styles.menuItemIcon, { backgroundColor: theme.primary + '15' }]}>
                <Text style={styles.menuItemIconText}>✏️</Text>
              </View>
              <Text style={[styles.floatingMenuText, { color: theme.text }]}>Edit Person</Text>
              <Text style={[styles.menuItemArrow, { color: theme.textMuted }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.floatingMenuItem, { borderBottomColor: theme.divider }]} onPress={() => { closeMenu(); setTimeout(() => setSelectionMode(true), 200); }} activeOpacity={0.7}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#3B82F615' }]}>
                <Text style={styles.menuItemIconText}>☑️</Text>
              </View>
              <Text style={[styles.floatingMenuText, { color: theme.text }]}>Select Multiple</Text>
              <Text style={[styles.menuItemArrow, { color: theme.textMuted }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.floatingMenuItem, { borderBottomColor: theme.divider }]} onPress={handleResetScore} activeOpacity={0.7}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#F59E0B15' }]}>
                <Text style={styles.menuItemIconText}>🔄</Text>
              </View>
              <Text style={[styles.floatingMenuText, { color: theme.text }]}>Reset Score</Text>
              <Text style={[styles.menuItemArrow, { color: theme.textMuted }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.floatingMenuItem, { borderBottomWidth: 0 }]} onPress={handleDelete} activeOpacity={0.7}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#EF444415' }]}>
                <Text style={styles.menuItemIconText}>🗑️</Text>
              </View>
              <Text style={[styles.floatingMenuText, { color: '#EF4444' }]}>Delete Person</Text>
              <Text style={[styles.menuItemArrow, { color: '#EF4444' }]}>›</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={[styles.editSheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.divider }]} />
            
            <View style={styles.editHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Person</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[styles.closeButton, { color: theme.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.editAvatarTouchable}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.editAvatarImage} />
              ) : (
                <View style={[styles.editAvatarContainer, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.editAvatarText, { color: theme.primary }]}>
                    {editName ? editName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={styles.editCameraBadge}>
                <Text style={styles.editCameraBadgeIcon}>✏️</Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.tapToChangeText, { color: theme.textMuted }]}>Tap to change photo</Text>

            <View style={styles.editSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.editLabel, { color: theme.textMuted }]}>NAME</Text>
                {editName.trim().length === 1 && <Text style={styles.errorText}>Too short</Text>}
                {editName.trim().length >= 2 && editName.trim().toLowerCase() !== person?.name.toLowerCase() && checkPersonNameExists(editName.trim()) && (
                  <Text style={styles.errorText}>Already exists</Text>
                )}
                <Text style={[styles.charCount, { color: editName.length >= 20 ? '#EF4444' : theme.textMuted }]}>{editName.length}/25</Text>
              </View>
              <TextInput
                style={[styles.editInput, { 
                  backgroundColor: theme.backgroundSecondary, color: theme.text,
                  borderColor: editName.trim().length === 0 ? theme.divider : editName.trim().length === 1 ? '#EF4444' : 
                    (editName.trim().toLowerCase() !== person?.name.toLowerCase() && checkPersonNameExists(editName.trim())) ? '#EF4444' : '#10B981'
                }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                placeholderTextColor={theme.textMuted}
                maxLength={25}
              />
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: theme.textMuted }]}>RELATIONSHIP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                {relationshipTypes.map((type) => {
                  const isSelected = editRelationship === type.type;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.chip, { backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary, borderColor: isSelected ? theme.primary : theme.divider }]}
                      onPress={() => setEditRelationship(type.type)}
                    >
                      <Text style={styles.chipEmoji}>{type.emoji}</Text>
                      <Text style={[styles.chipText, { color: isSelected ? '#FFF' : theme.text }]}>{type.type}</Text>
                      {isSelected && <Text style={styles.chipCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TouchableOpacity style={[styles.saveButton, { opacity: isEditValid() ? 1 : 0.5 }]} onPress={handleSaveEdit} disabled={!isEditValid()}>
              <LinearGradient colors={[theme.primary, theme.primaryLight]} style={styles.saveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{incidents.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{incidents.filter(i => i.points < 0).length}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Negative</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{incidents.filter(i => i.points > 0).length}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Positive</Text>
        </View>
      </View>

      <FlatList
        data={incidents.slice(0, visibleCount)}
        renderItem={renderIncident}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Patterns</Text>
              {incidents.length > 0 ? (
                <View style={styles.patternsList}>
                  <View style={[styles.patternRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Biggest Issue</Text>
                    <Text style={[styles.patternValue, { color: theme.text }]}>
                      {(() => {
                        const negativeIncidents = incidents.filter(i => i.points < 0);
                        if (negativeIncidents.length === 0) return 'None 🎉';
                        const counts: any = {};
                        negativeIncidents.forEach(i => { counts[i.category_name] = (counts[i.category_name] || 0) + 1; });
                        const biggest = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0];
                        return `${biggest[0]} (${biggest[1]}x)`;
                      })()}
                    </Text>
                  </View>
                  <View style={[styles.patternRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Trend</Text>
                    <Text style={[styles.patternValue, { color: theme.text }]}>
                      {(() => {
                        if (incidents.length < 2) return '—';
                        const recent = incidents.slice(0, Math.ceil(incidents.length / 2));
                        const older = incidents.slice(Math.ceil(incidents.length / 2));
                        const recentAvg = recent.reduce((sum, i) => sum + i.points, 0) / recent.length;
                        const olderAvg = older.reduce((sum, i) => sum + i.points, 0) / older.length;
                        if (recentAvg > olderAvg + 2) return '📈 Improving';
                        if (recentAvg < olderAvg - 2) return '📉 Declining';
                        return '→ Stable';
                      })()}
                    </Text>
                  </View>
                  <View style={[styles.patternRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Last Interaction</Text>
                    <Text style={[styles.patternValue, { color: theme.text }]}>{formatDate(incidents[0].timestamp)}</Text>
                  </View>
                  <View style={[styles.patternRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.patternLabel, { color: theme.textMuted }]}>Positive Rate</Text>
                    <Text style={[styles.patternValue, { color: '#10B981' }]}>
                      {Math.round((incidents.filter(i => i.points > 0).length / incidents.length) * 100)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.emptyPatterns, { color: theme.textMuted }]}>Log some incidents to see patterns</Text>
              )}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>🤖 AI Insights</Text>
                <View style={[styles.premiumBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.premiumBadgeText, { color: theme.primary }]}>PRO</Text>
                </View>
              </View>
              {!aiInsights ? (
                <TouchableOpacity style={[styles.generateButton, { backgroundColor: theme.primary }]} onPress={() => handleGenerateInsights(false)} disabled={loadingInsights} activeOpacity={0.8}>
                  <Text style={styles.generateButtonText}>{loadingInsights ? 'Analyzing...' : 'Generate Insights'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.insightsBox, { backgroundColor: theme.backgroundSecondary, borderLeftColor: theme.primary }]}>
                  <View style={styles.insightsHeader}>
                    <Text style={[styles.insightsTimestamp, { color: theme.textMuted }]}>
                      {aiInsights.isCached ? '📦 Cached' : '✨ Fresh'} • {aiInsights.generatedAt}
                    </Text>
                  </View>
                  <Text style={[styles.insightsText, { color: theme.text }]}>{aiInsights.content}</Text>
                  <TouchableOpacity style={styles.regenerateButton} onPress={() => handleGenerateInsights(true)} disabled={loadingInsights}>
                    <Text style={[styles.regenerateButtonText, { color: theme.primary }]}>{loadingInsights ? 'Analyzing...' : '🔄 Regenerate'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {incidents.length > 0 && <Text style={[styles.incidentsHeader, { color: theme.text }]}>Recent Activity</Text>}
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>No incidents logged yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Tap + to start tracking interactions</Text>
          </View>
        )}

        ListFooterComponent={() => (
          incidents.length > 50 && visibleCount < incidents.length ? (
            <View style={styles.viewMoreContainer}>
              <Text style={[styles.showingText, { color: theme.textMuted }]}>
                Showing {Math.min(visibleCount, incidents.length)} of {incidents.length}
              </Text>
              <TouchableOpacity 
                style={[styles.viewMoreButton, { backgroundColor: theme.primary + '15' }]} 
                onPress={() => setVisibleCount(prev => prev + 50)}
              >
                <Text style={[styles.viewMoreText, { color: theme.primary }]}>View More</Text>
              </TouchableOpacity>
            </View>
          ) : null
        )}
      />


      {selectionMode ? (
        <View style={[styles.selectionToolbar, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
          <TouchableOpacity style={[styles.toolbarButton, { backgroundColor: theme.backgroundSecondary }]} onPress={() => { setSelectionMode(false); setSelectedIncidents([]); }}>
            <Text style={[styles.toolbarButtonText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.selectedCount, { color: theme.text }]}>{selectedIncidents.length} selected</Text>
          <TouchableOpacity style={[styles.toolbarButton, styles.deleteButton]} onPress={handleBulkDelete} disabled={selectedIncidents.length === 0}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.fab} onPress={() => (navigation as any).navigate('LogIncident', { personId: personId })} activeOpacity={0.9}>
          <LinearGradient colors={[theme.primary, theme.primaryLight]} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 22,
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraBadgeIcon: {
    fontSize: 14,
  },
  personName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
    marginBottom: 16,
  },
  relationshipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    gap: 6,
  },
  relationshipEmoji: {
    fontSize: 16,
  },
  relationshipType: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scoreDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
  },
  scoreNumber: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  scoreSectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  menuOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
  },
  floatingMenu: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 220,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 101,
    overflow: 'visible',
  },
  menuArrow: {
    position: 'absolute',
    top: -8,
    right: 14,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  floatingMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemIconText: {
    fontSize: 18,
  },
  floatingMenuText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  menuItemArrow: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  editSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    fontSize: 22,
    padding: 4,
  },
  editAvatarTouchable: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 8,
  },
  editAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  editCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  editCameraBadgeIcon: {
    fontSize: 12,
  },
  tapToChangeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  editSection: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  editLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#EF4444',
    marginRight: 8,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  editInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    borderWidth: 1.5,
  },
  chipsContainer: {
    paddingVertical: 4,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
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
  chipCheck: {
    fontSize: 12,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: -12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  patternsList: {},
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  patternLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  patternValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyPatterns: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 16,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  generateButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  insightsBox: {
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  insightsHeader: {
    marginBottom: 8,
  },
  insightsTimestamp: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  insightsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 12,
  },
  regenerateButton: {
    alignSelf: 'flex-start',
  },
  regenerateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  incidentsHeader: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    marginTop: 8,
  },
  incidentCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  incidentContent: {
    flex: 1,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentEmoji: {
    fontSize: 22,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  incidentTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  pointsContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  majorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  majorBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  incidentPoints: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  incidentNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  selectionToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  toolbarButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  toolbarButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  selectedCount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Inter_300Light',
  },
  viewMoreContainer: {
  alignItems: 'center',
  paddingVertical: 16,
  gap: 12,
},
showingText: {
  fontSize: 13,
  fontFamily: 'Inter_500Medium',
},
viewMoreButton: {
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 20,
},
viewMoreText: {
  fontSize: 14,
  fontFamily: 'Inter_600SemiBold',
},
});