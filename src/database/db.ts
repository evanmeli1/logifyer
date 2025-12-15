import * as SQLite from 'expo-sqlite';
import { initAICacheTable } from './aiCache';
import { Person } from '../types';
import { updateStreak } from '../services/streakService';

// Singleton database instance with getter to ensure it's initialized
let _db: SQLite.SQLiteDatabase | null = null;

const getDb = (): SQLite.SQLiteDatabase => {
  if (!_db) {
    try {
      _db = SQLite.openDatabaseSync('logifyer.db');
      console.log('✅ Database connection opened');
    } catch (error) {
      console.error('❌ Failed to open database:', error);
      throw new Error('Database initialization failed');
    }
  }
  return _db;
};

export const initDatabase = () => {
  const db = getDb();
  
  
  try {
    db.withTransactionSync(() => {
      // People table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS people (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          photo_uri TEXT,
          relationship_type TEXT NOT NULL,
          archived INTEGER DEFAULT 0,
          is_favorite INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Add columns if they don't exist (safe migrations)
      const columns = db.getAllSync<{ name: string }>(
        "PRAGMA table_info(people)"
      );
      const columnNames = columns.map(c => c.name);
      
      if (!columnNames.includes('archived')) {
        db.execSync(`ALTER TABLE people ADD COLUMN archived INTEGER DEFAULT 0;`);
        console.log('✅ Added archived column to people table');
      }
      
      if (!columnNames.includes('is_favorite')) {
        db.execSync(`ALTER TABLE people ADD COLUMN is_favorite INTEGER DEFAULT 0;`);
        console.log('✅ Added is_favorite column to people table');
      }

      // Categories table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL,
          default_points INTEGER NOT NULL,
          is_positive INTEGER NOT NULL,
          is_custom INTEGER DEFAULT 0,
          UNIQUE(name, is_custom)
        );
      `);

      // Incidents table with proper foreign keys
      db.execSync(`
        CREATE TABLE IF NOT EXISTS incidents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          points INTEGER NOT NULL,
          is_major INTEGER DEFAULT 0,
          note TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        );
      `);

      // SAFE MIGRATION: add feeling_key column
      const incidentCols = db.getAllSync<{ name: string }>(
        'PRAGMA table_info(incidents)'
      );
      const incidentColNames = incidentCols.map(c => c.name);

      if (!incidentColNames.includes('feeling_key')) {
        db.execSync(`ALTER TABLE incidents ADD COLUMN feeling_key TEXT;`);
      }


      // Create indices for better performance
      db.execSync(`CREATE INDEX IF NOT EXISTS idx_incidents_person ON incidents(person_id);`);
      db.execSync(`CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);`);
      db.execSync(`CREATE INDEX IF NOT EXISTS idx_people_archived ON people(archived);`);
    });

    // Initialize AI cache table (separate since it has its own error handling)
    initAICacheTable(db);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw new Error('Failed to initialize database tables');
  }
};

export const initSettings = () => {
  const db = getDb();
  
  try {
    db.withTransactionSync(() => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          major_multiplier INTEGER DEFAULT 3,
          time_decay_months INTEGER DEFAULT 6,
          recency_boost_enabled INTEGER DEFAULT 1
        );
      `);
      
      const existing = db.getFirstSync('SELECT * FROM settings WHERE id = 1');
      if (!existing) {
        db.runSync(
          'INSERT INTO settings (id, major_multiplier, time_decay_months, recency_boost_enabled) VALUES (1, 3, 0, 0)'
        );
        console.log('✅ Default settings created');
      }
    });
  } catch (error) {
    console.error('❌ Error initializing settings:', error);
    throw error;
  }
};

export const getSettings = (): {
  major_multiplier: number;
  time_decay_months: number;
  recency_boost_enabled: number;
} | null => {
  const db = getDb();
  
  try {
    const result = db.getFirstSync<{
      major_multiplier: number;
      time_decay_months: number;
      recency_boost_enabled: number;
    }>('SELECT * FROM settings WHERE id = 1');
    
    return result || null;
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
};

export const updateSettings = (
  majorMultiplier: number, 
  timeDecayMonths: number, 
  recencyBoostEnabled: boolean
): boolean => {
  const db = getDb();
  
  // Validate inputs
  if (majorMultiplier < 1 || majorMultiplier > 10) {
    console.error('Invalid major multiplier:', majorMultiplier);
    return false;
  }
  
  if (timeDecayMonths < 0 || timeDecayMonths > 120) {
    console.error('Invalid time decay months:', timeDecayMonths);
    return false;
  }
  
  try {
    db.runSync(
      'UPDATE settings SET major_multiplier = ?, time_decay_months = ?, recency_boost_enabled = ? WHERE id = 1',
      [majorMultiplier, timeDecayMonths, recencyBoostEnabled ? 1 : 0]
    );
    return true;
  } catch (error) {
    console.error('Error updating settings:', error);
    return false;
  }
};

export const seedCategories = () => {
  const db = getDb();
  
  const defaults = [
    { name: 'Cancelled plans', emoji: '🚫', points: -3, positive: 0 },
    { name: 'Lied/deceived', emoji: '🤥', points: -8, positive: 0 },
    { name: 'Disrespected you', emoji: '😤', points: -8, positive: 0 },
    { name: 'Always late', emoji: '⏰', points: -1, positive: 0 },
    { name: 'Borrowed money unpaid', emoji: '💸', points: -5, positive: 0 },
    { name: 'Only reaches out needing something', emoji: '🙄', points: -3, positive: 0 },
    { name: 'Showed up when needed', emoji: '✅', points: 8, positive: 1 },
    { name: 'Actually listened', emoji: '👂', points: 5, positive: 1 },
    { name: 'Had your back', emoji: '🤝', points: 8, positive: 1 },
    { name: 'Supported you', emoji: '💪', points: 5, positive: 1 },
  ];

  try {
    db.withTransactionSync(() => {
      // First, clean up any duplicate default categories
      db.execSync(`
        DELETE FROM categories 
        WHERE is_custom = 0 
        AND id NOT IN (
          SELECT MIN(id) FROM categories WHERE is_custom = 0 GROUP BY name
        )
      `);

      // Insert missing default categories
      defaults.forEach(cat => {
        const exists = db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM categories WHERE name = ? AND is_custom = 0',
          [cat.name]
        );
        
        if (!exists || exists.count === 0) {
          db.runSync(
            'INSERT INTO categories (name, emoji, default_points, is_positive, is_custom) VALUES (?, ?, ?, ?, 0)',
            [cat.name, cat.emoji, cat.points, cat.positive]
          );
        }
      });
    });
    
    console.log('✅ Categories initialized (duplicates cleaned)');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
};

export const addPerson = (
  name: string, 
  relationshipType: string, 
  photoUri?: string
): number | null => {
  const db = getDb();
  
  // Validate inputs
  if (!name || name.trim().length === 0) {
    console.error('Invalid person name');
    return null;
  }
  
  if (!relationshipType || relationshipType.trim().length === 0) {
    console.error('Invalid relationship type');
    return null;
  }
  
  if (name.trim().length > 100) {
    console.error('Person name too long');
    return null;
  }
  
  try {
    const result = db.runSync(
      'INSERT INTO people (name, relationship_type, photo_uri) VALUES (?, ?, ?)',
      [name.trim(), relationshipType, photoUri || null]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding person:', error);
    return null;
  }
};

export const getAllPeople = (): Person[] => {
  const db = getDb();
  
  try {
    return db.getAllSync<Person>('SELECT * FROM people ORDER BY created_at DESC');
  } catch (error) {
    console.error('Error getting all people:', error);
    return [];
  }
};

export const getAllCategories = () => {
  const db = getDb();
  
  try {
    return db.getAllSync('SELECT * FROM categories');
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getPersonScore = (personId: number): number => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return 100; // Neutral score
  }
  
  try {
    const settings = getSettings();
    const majorMultiplier = settings?.major_multiplier || 3;
    const timeDecayMonths = settings?.time_decay_months || 6;
    const recencyBoostEnabled = settings?.recency_boost_enabled === 1;

    const incidents = db.getAllSync<{
      points: number;
      is_major: number;
      timestamp: string;
    }>(
      'SELECT points, is_major, timestamp FROM incidents WHERE person_id = ?',
      [personId]
    );

    if (!incidents || incidents.length === 0) {
      return 100; // Neutral score for new people
    }

    let totalPoints = 0;
    const now = new Date();

    incidents.forEach((incident) => {
      let points = incident.points;
      
      // Validate timestamp
      const incidentDate = new Date(incident.timestamp);
      if (isNaN(incidentDate.getTime())) {
        console.warn('Invalid timestamp:', incident.timestamp);
        return; // Skip this incident
      }
      
      const timeDiff = now.getTime() - incidentDate.getTime();
      
      // Skip future incidents
      if (timeDiff < 0) {
        console.warn('Future incident detected, skipping');
        return;
      }
      
      const monthsOld = timeDiff / (1000 * 60 * 60 * 24 * 30.44); // More accurate month calculation
      const daysOld = timeDiff / (1000 * 60 * 60 * 24);

      // Recency boost for non-major incidents only
      if (recencyBoostEnabled && daysOld <= 30 && incident.is_major === 0) {
        points = points * 1.5;
      }

      // Time decay
      if (timeDecayMonths > 0 && monthsOld > timeDecayMonths) {
        const decayFactor = Math.max(0.25, 1 - ((monthsOld - timeDecayMonths) / timeDecayMonths) * 0.75);
        points = points * decayFactor;
      }

      totalPoints += points;
    });

    const finalScore = 100 + Math.round(totalPoints);
    return Math.max(0, Math.min(100, finalScore));
  } catch (error) {
    console.error('Error calculating person score:', error);
    return 100; // Return neutral score on error
  }
};

export const deletePerson = (personId: number): boolean => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return false;
  }
  
  try {
    db.withTransactionSync(() => {
      // With CASCADE, incidents will be deleted automatically
      // But we'll be explicit for clarity
      db.runSync('DELETE FROM incidents WHERE person_id = ?', [personId]);
      db.runSync('DELETE FROM people WHERE id = ?', [personId]);
    });
    console.log(`✅ Person ${personId} deleted`);
    return true;
  } catch (error) {
    console.error('Error deleting person:', error);
    return false;
  }
};

export const getPersonById = (personId: number): Person | null => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return null;
  }
  
  try {
    return db.getFirstSync<Person>('SELECT * FROM people WHERE id = ?', [personId]) || null;
  } catch (error) {
    console.error('Error getting person:', error);
    return null;
  }
};

export const getIncidentsByPerson = (personId: number) => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return [];
  }
  
  try {
    return db.getAllSync(`
      SELECT i.*, c.name as category_name, c.emoji as category_emoji
      FROM incidents i
      JOIN categories c ON i.category_id = c.id
      WHERE i.person_id = ?
      ORDER BY i.timestamp DESC
    `, [personId]);
  } catch (error) {
    console.error('Error getting incidents:', error);
    return [];
  }
};

export const deleteIncident = (incidentId: number): boolean => {
  const db = getDb();
  
  if (!incidentId || incidentId <= 0) {
    console.error('Invalid incident ID:', incidentId);
    return false;
  }
  
  try {
    db.runSync('DELETE FROM incidents WHERE id = ?', [incidentId]);
    return true;
  } catch (error) {
    console.error('Error deleting incident:', error);
    return false;
  }
};

export const logIncident = (
  personId: number,
  categoryId: number,
  points: number,
  isMajor: boolean,
  note?: string,
  feelingKey: string = 'calm'
): boolean => {

  const db = getDb();
  
  // Validate inputs
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return false;
  }
  
  if (!categoryId || categoryId <= 0) {
    console.error('Invalid category ID:', categoryId);
    return false;
  }
  
  if (points === 0) {
    console.error('Points cannot be zero');
    return false;
  }
  
  if (Math.abs(points) > 100) {
    console.error('Points value too large:', points);
    return false;
  }
  
  try {
    const settings = getSettings();
    const majorMultiplier = settings?.major_multiplier || 3;
    const finalPoints = isMajor ? points * majorMultiplier : points;
    
    db.runSync(
  'INSERT INTO incidents (person_id, category_id, points, is_major, note, feeling_key, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [
    personId,
    categoryId,
    finalPoints,
    isMajor ? 1 : 0,
    note?.trim() || null,
    feelingKey ?? 'calm',
    new Date().toISOString(),
  ]
);


    const streakResult = updateStreak();
    if (streakResult.milestoneReached) {
      console.log(`🎉 Milestone: ${streakResult.milestoneReached} days!`);
    }
    
    return true;
  } catch (error) {
    console.error('Error logging incident:', error);
    return false;
  }
};

export const updateCategoryWeight = (categoryId: number, newPoints: number): boolean => {
  const db = getDb();
  
  if (!categoryId || categoryId <= 0) {
    console.error('Invalid category ID:', categoryId);
    return false;
  }
  
  if (newPoints === 0 || Math.abs(newPoints) > 100) {
    console.error('Invalid points value:', newPoints);
    return false;
  }
  
  try {
    db.runSync('UPDATE categories SET default_points = ? WHERE id = ?', [newPoints, categoryId]);
    return true;
  } catch (error) {
    console.error('Error updating category weight:', error);
    return false;
  }
};

export const addCustomCategory = (
  name: string, 
  emoji: string, 
  points: number, 
  isPositive: boolean
): boolean => {
  const db = getDb();
  
  // Validate inputs
  if (!name || name.trim().length === 0) {
    console.error('Category name cannot be empty');
    return false;
  }
  
  if (!emoji || emoji.trim().length === 0) {
    console.error('Category emoji cannot be empty');
    return false;
  }
  
  if (points === 0 || Math.abs(points) > 100) {
    console.error('Invalid points value:', points);
    return false;
  }
  
  try {
    db.runSync(
      'INSERT INTO categories (name, emoji, default_points, is_positive, is_custom) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), emoji, points, isPositive ? 1 : 0]
    );
    return true;
  } catch (error) {
    console.error('Error adding custom category:', error);
    return false;
  }
};

export const deleteCategory = (categoryId: number): boolean => {
  const db = getDb();
  
  if (!categoryId || categoryId <= 0) {
    console.error('Invalid category ID:', categoryId);
    return false;
  }
  
  try {
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM incidents WHERE category_id = ?', [categoryId]);
      db.runSync('DELETE FROM categories WHERE id = ?', [categoryId]);
    });
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

export const resetPersonScore = (personId: number): boolean => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return false;
  }
  
  try {
    db.runSync('DELETE FROM incidents WHERE person_id = ?', [personId]);
    return true;
  } catch (error) {
    console.error('Error resetting person score:', error);
    return false;
  }
};

export const toggleFavorite = (personId: number): boolean => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return false;
  }
  
  try {
    const person = db.getFirstSync<Person>('SELECT * FROM people WHERE id = ?', [personId]);
    
    if (!person) {
      console.error('Person not found:', personId);
      return false;
    }
    
    const newFavoriteStatus = person.is_favorite ? 0 : 1;
    db.runSync('UPDATE people SET is_favorite = ? WHERE id = ?', [newFavoriteStatus, personId]);
    return true;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  return getDb();
};

// ============ CUSTOM RELATIONSHIP TYPES ============

export const initRelationshipTypes = () => {
  const db = getDb();
  
  try {
    db.withTransactionSync(() => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS relationship_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL UNIQUE,
          emoji TEXT NOT NULL,
          is_custom INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default relationship types
      const defaults = [
        { type: 'Friend', emoji: '👋' },
        { type: 'Family', emoji: '👨‍👩‍👧' },
        { type: 'Partner', emoji: '❤️' },
        { type: 'Ex', emoji: '💔' },
        { type: 'Coworker', emoji: '💼' },
        { type: 'Acquaintance', emoji: '🤝' },
      ];

      defaults.forEach(item => {
        const exists = db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM relationship_types WHERE type = ?',
          [item.type]
        );
        
        if (!exists || exists.count === 0) {
          db.runSync(
            'INSERT INTO relationship_types (type, emoji, is_custom) VALUES (?, ?, 0)',
            [item.type, item.emoji]
          );
        }
      });
    });

    console.log('✅ Relationship types initialized');
  } catch (error) {
    console.error('❌ Error initializing relationship types:', error);
    throw error;
  }
};

export const getAllRelationshipTypes = () => {
  const db = getDb();
  
  try {
    return db.getAllSync('SELECT * FROM relationship_types ORDER BY is_custom DESC, id DESC');
  } catch (error) {
    console.error('Error getting relationship types:', error);
    return [];
  }
};

export const getCustomRelationshipTypesCount = (): number => {
  const db = getDb();
  
  try {
    const result = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM relationship_types WHERE is_custom = 1'
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting custom relationship types count:', error);
    return 0;
  }
};

export const addCustomRelationshipType = (type: string, emoji: string): boolean => {
  const db = getDb();
  
  // Validate inputs
  if (!type || type.trim().length === 0) {
    throw new Error('Relationship type cannot be empty');
  }
  
  if (!emoji || emoji.trim().length === 0) {
    throw new Error('Emoji cannot be empty');
  }
  
  if (type.trim().length > 50) {
    throw new Error('Relationship type too long (max 50 characters)');
  }
  
  try {
    const exists = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM relationship_types WHERE type = ?',
      [type.trim()]
    );
    
    if (exists && exists.count > 0) {
      throw new Error('Relationship type already exists');
    }

    const customCount = getCustomRelationshipTypesCount();
    if (customCount >= 10) {
      throw new Error('Maximum custom relationship types reached (10)');
    }

    db.runSync(
      'INSERT INTO relationship_types (type, emoji, is_custom) VALUES (?, ?, 1)',
      [type.trim(), emoji]
    );
    
    return true;
  } catch (error) {
    console.error('Error adding custom relationship type:', error);
    throw error;
  }
};

export const deleteCustomRelationshipType = (type: string): boolean => {
  const db = getDb();
  
  if (!type || type.trim().length === 0) {
    console.error('Invalid relationship type');
    return false;
  }
  
  try {
    db.runSync('DELETE FROM relationship_types WHERE type = ? AND is_custom = 1', [type]);
    return true;
  } catch (error) {
    console.error('Error deleting custom relationship type:', error);
    return false;
  }
};

export const getPersonTrend = (personId: number): 'improving' | 'declining' | 'stable' | 'new' => {
  const db = getDb();
  
  if (!personId || personId <= 0) {
    console.error('Invalid person ID:', personId);
    return 'new';
  }
  
  try {
    const incidents = db.getAllSync<{ points: number }>(
      'SELECT points FROM incidents WHERE person_id = ? ORDER BY timestamp DESC',
      [personId]
    );

    if (!incidents || incidents.length < 2) {
      return 'new';
    }

    const midpoint = Math.ceil(incidents.length / 2);
    const recent = incidents.slice(0, midpoint);
    const older = incidents.slice(midpoint);

    const recentAvg = recent.reduce((sum, i) => sum + i.points, 0) / recent.length;
    const olderAvg = older.reduce((sum, i) => sum + i.points, 0) / older.length;

    if (recentAvg > olderAvg + 2) return 'improving';
    if (recentAvg < olderAvg - 2) return 'declining';
    return 'stable';
  } catch (error) {
    console.error('Error getting person trend:', error);
    return 'new';
  }
};

export const checkPersonNameExists = (name: string): boolean => {
  const db = getDb();
  
  if (!name || name.trim().length === 0) {
    return false;
  }
  
  try {
    const result = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM people WHERE LOWER(name) = LOWER(?)',
      [name.trim()]
    );
    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking person name:', error);
    return false;
  }
};

export const deleteAllData = (): boolean => {
  const db = getDb();
  
  try {
    db.withTransactionSync(() => {
      // Delete all incidents
      db.runSync('DELETE FROM incidents');
      console.log('✅ All incidents deleted');
      
      // Delete all people
      db.runSync('DELETE FROM people');
      console.log('✅ All people deleted');
      
      // Delete custom categories only (keep default ones)
      db.runSync('DELETE FROM categories WHERE is_custom = 1');
      console.log('✅ Custom categories deleted');
      
      // Delete custom relationship types only (keep default ones)
      db.runSync('DELETE FROM relationship_types WHERE is_custom = 1');
      console.log('✅ Custom relationship types deleted');
      
      // Clear AI cache - CORRECT TABLE NAME
      try {
        db.runSync('DELETE FROM ai_insight_cache');
        console.log('✅ AI cache cleared');
      } catch (e) {
        console.log('AI cache table does not exist, skipping');
      }
    });
    
    console.log('✅ All user data deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting all data:', error);
    return false;
  }
};

export const getFeelingCounts = (days?: number) => {
  const db = getDb();

  // Robust time compare for ISO timestamps like 2025-12-14T21:00:00.000Z
  const tsExpr = "datetime(replace(substr(timestamp,1,19),'T',' '))";

  const where = days
    ? `WHERE ${tsExpr} >= datetime('now', ?)`
    : '';

  const params = days ? [`-${days} days`] : [];

  try {
    return db.getAllSync<{ feeling_key: string; count: number }>(
      `
      SELECT COALESCE(feeling_key, 'calm') as feeling_key, COUNT(*) as count
      FROM incidents
      ${where}
      GROUP BY COALESCE(feeling_key, 'calm')
      ORDER BY count DESC
      `,
      params
    );
  } catch (e) {
    console.error('Error getting feeling counts:', e);
    return [];
  }
};
