import * as SQLite from 'expo-sqlite';
import { supabase } from './supabase';

const db = SQLite.openDatabaseSync('logifyer.db');

// Generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const syncLocalToCloud = async (userId: string) => {
  try {
    console.log('🔄 Starting local to cloud sync...');

    // First, create/update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        subscription_status: 'free',
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    // Get all local data
    const people = db.getAllSync('SELECT * FROM people');
    const categories = db.getAllSync('SELECT * FROM categories');
    const incidents = db.getAllSync('SELECT * FROM incidents');
    const settings = db.getFirstSync('SELECT * FROM settings WHERE id = 1');

    console.log('📊 Local data:', {
      people: people.length,
      categories: categories.length,
      incidents: incidents.length,
    });

    // Map local IDs to UUIDs
    const personIdMap = new Map();
    const categoryIdMap = new Map();

    // Sync people
    for (const person of people as any[]) {
      const uuid = generateUUID();
      personIdMap.set(person.id, uuid);

      const { error } = await supabase
        .from('people')
        .upsert({
          id: uuid,
          user_id: userId,
          name: person.name,
          photo_uri: person.photo_uri,
          relationship_type: person.relationship_type,
          archived: person.archived === 1,
          created_at: person.created_at,
        });
      
      if (error) console.error('Error syncing person:', error);
    }

    // Sync ALL categories (both default and custom)
    for (const category of categories as any[]) {
      const uuid = generateUUID();
      categoryIdMap.set(category.id, uuid);

      const { error } = await supabase
        .from('categories')
        .upsert({
          id: uuid,
          user_id: userId,
          name: category.name,
          emoji: category.emoji,
          default_points: category.default_points,
          is_positive: category.is_positive === 1,
          is_custom: category.is_custom === 1,
        });
      
      if (error) console.error('Error syncing category:', error);
    }

    // Sync incidents (with mapped UUIDs)
    for (const incident of incidents as any[]) {
      const uuid = generateUUID();
      const mappedPersonId = personIdMap.get(incident.person_id);
      const mappedCategoryId = categoryIdMap.get(incident.category_id);

      if (!mappedPersonId || !mappedCategoryId) {
        console.log('Skipping incident - missing mapping');
        continue;
      }

      const { error } = await supabase
        .from('incidents')
        .upsert({
          id: uuid,
          user_id: userId,
          person_id: mappedPersonId,
          category_id: mappedCategoryId,
          points: incident.points,
          is_major: incident.is_major === 1,
          note: incident.note,
          timestamp: incident.timestamp,
        });
      
      if (error) console.error('Error syncing incident:', error);
    }

    // Sync settings
    if (settings) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: userId,
          major_multiplier: (settings as any).major_multiplier,
          time_decay_months: (settings as any).time_decay_months,
          recency_boost_enabled: (settings as any).recency_boost_enabled === 1,
        });
      
      if (error) console.error('Error syncing settings:', error);
    }

    console.log('✅ Local to cloud sync complete!');
  } catch (error) {
    console.error('❌ Sync error:', error);
    throw error;
  }
};

export const syncCloudToLocal = async (userId: string) => {
  try {
    console.log('⬇️ Starting cloud to local sync...');

    // Get cloud data
    const { data: cloudPeople } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', userId);

    const { data: cloudCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    const { data: cloudIncidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', userId);

    const { data: cloudSettings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('📥 Cloud data:', {
      people: cloudPeople?.length || 0,
      categories: cloudCategories?.length || 0,
      incidents: cloudIncidents?.length || 0,
    });

    // Clear local data first
    db.runSync('DELETE FROM incidents');
    db.runSync('DELETE FROM people');
    db.runSync('DELETE FROM categories WHERE is_custom = 1');
    db.runSync('DELETE FROM settings WHERE id = 1');

    console.log('🗑️ Local data cleared');

    // Map cloud UUIDs to local integer IDs
    const personIdMap = new Map();
    const categoryIdMap = new Map();

    // Insert people
    if (cloudPeople) {
      for (const person of cloudPeople) {
        const result = db.runSync(
          'INSERT INTO people (name, relationship_type, photo_uri, archived, created_at) VALUES (?, ?, ?, ?, ?)',
          [person.name, person.relationship_type, person.photo_uri, person.archived ? 1 : 0, person.created_at]
        );
        personIdMap.set(person.id, result.lastInsertRowId);
      }
    }

    // Insert categories
    if (cloudCategories) {
      for (const category of cloudCategories) {
        const result = db.runSync(
          'INSERT INTO categories (name, emoji, default_points, is_positive, is_custom) VALUES (?, ?, ?, ?, ?)',
          [category.name, category.emoji, category.default_points, category.is_positive ? 1 : 0, category.is_custom ? 1 : 0]
        );
        categoryIdMap.set(category.id, result.lastInsertRowId);
      }
    }

    // Insert incidents
    if (cloudIncidents) {
      for (const incident of cloudIncidents) {
        const localPersonId = personIdMap.get(incident.person_id);
        const localCategoryId = categoryIdMap.get(incident.category_id);

        if (localPersonId && localCategoryId) {
          db.runSync(
            'INSERT INTO incidents (person_id, category_id, points, is_major, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [localPersonId, localCategoryId, incident.points, incident.is_major ? 1 : 0, incident.note, incident.timestamp]
          );
        }
      }
    }

    // Insert settings
    if (cloudSettings) {
      db.runSync(
        'INSERT INTO settings (id, major_multiplier, time_decay_months, recency_boost_enabled) VALUES (1, ?, ?, ?)',
        [cloudSettings.major_multiplier, cloudSettings.time_decay_months, cloudSettings.recency_boost_enabled ? 1 : 0]
      );
    }

    console.log('✅ Cloud to local sync complete!');
  } catch (error) {
    console.error('❌ Cloud to local sync error:', error);
    throw error;
  }
};

export const clearLocalData = () => {
  try {
    console.log('🗑️ Clearing all local data...');
    db.runSync('DELETE FROM incidents');
    db.runSync('DELETE FROM people');
    db.runSync('DELETE FROM categories WHERE is_custom = 1');
    db.runSync('DELETE FROM settings WHERE id = 1');
    console.log('✅ Local data cleared');
  } catch (error) {
    console.error('❌ Error clearing local data:', error);
    throw error;
  }
};