import * as SQLite from 'expo-sqlite';
import { initAICacheTable } from './aiCache';
import { Person } from '../types';


const db = SQLite.openDatabaseSync('logifyer.db');

export const initDatabase = () => {
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
  
  try {
    db.execSync(`ALTER TABLE people ADD COLUMN archived INTEGER DEFAULT 0;`);
  } catch (e) {}
  
  try {
    db.execSync(`ALTER TABLE people ADD COLUMN is_favorite INTEGER DEFAULT 0;`);
  } catch (e) {}

  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      default_points INTEGER NOT NULL,
      is_positive INTEGER NOT NULL,
      is_custom INTEGER DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      is_major INTEGER DEFAULT 0,
      note TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (person_id) REFERENCES people (id),
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );
  `);

  initAICacheTable(db);

  console.log('Database tables created');
};

export const initSettings = () => {
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
    db.runSync('INSERT INTO settings (id, major_multiplier, time_decay_months, recency_boost_enabled) VALUES (1, 3, 6, 1)');
  }
};

export const getSettings = () => {
  return db.getFirstSync('SELECT * FROM settings WHERE id = 1');
};

export const updateSettings = (majorMultiplier: number, timeDecayMonths: number, recencyBoostEnabled: boolean) => {
  db.runSync(
    'UPDATE settings SET major_multiplier = ?, time_decay_months = ?, recency_boost_enabled = ? WHERE id = 1',
    [majorMultiplier, timeDecayMonths, recencyBoostEnabled ? 1 : 0]
  );
};

export const seedCategories = () => {
  // First, clean up any duplicate default categories (keep lowest ID for each name)
  db.execSync(`
    DELETE FROM categories 
    WHERE is_custom = 0 
    AND id NOT IN (
      SELECT MIN(id) FROM categories WHERE is_custom = 0 GROUP BY name
    )
  `);

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

  // Only insert if category with that name doesn't exist
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
  
  console.log('Categories initialized (duplicates cleaned)');
};

export const addPerson = (name: string, relationshipType: string, photoUri?: string) => {
  const result = db.runSync(
    'INSERT INTO people (name, relationship_type, photo_uri) VALUES (?, ?, ?)',
    [name, relationshipType, photoUri || null]
  );
  return result.lastInsertRowId;
};

export const getAllPeople = () => {
  return db.getAllSync('SELECT * FROM people ORDER BY created_at DESC');
};

export const getAllCategories = () => {
  return db.getAllSync('SELECT * FROM categories');
};

export const getPersonScore = (personId: number) => {
  const settings: any = getSettings();
  const majorMultiplier = settings?.major_multiplier || 3;
  const timeDecayMonths = settings?.time_decay_months || 6;
  const recencyBoostEnabled = settings?.recency_boost_enabled === 1;

  const incidents = db.getAllSync(
    'SELECT points, is_major, timestamp FROM incidents WHERE person_id = ?',
    [personId]
  ) as any[];

  let totalPoints = 0;
  const now = new Date();

  incidents.forEach((incident) => {
    let points = incident.points;
    const incidentDate = new Date(incident.timestamp);
    const monthsOld = (now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const daysOld = (now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24);

    // Only apply recency boost to NON-major incidents
    // Major incidents already have their multiplier applied at storage time
    if (recencyBoostEnabled && daysOld <= 30 && incident.is_major === 0) {
      points = points * 1.5;
    }

    if (timeDecayMonths > 0 && monthsOld > timeDecayMonths) {
      const decayFactor = Math.max(0.25, 1 - ((monthsOld - timeDecayMonths) / timeDecayMonths) * 0.75);
      points = points * decayFactor;
    }

    totalPoints += points;
  });

  const finalScore = 100 + Math.round(totalPoints);
  return Math.max(0, Math.min(100, finalScore));
};

export const deletePerson = (personId: number) => {
  db.runSync('DELETE FROM incidents WHERE person_id = ?', [personId]);
  db.runSync('DELETE FROM people WHERE id = ?', [personId]);
};

export const getPersonById = (personId: number) => {
  return db.getFirstSync('SELECT * FROM people WHERE id = ?', [personId]);
};

export const getIncidentsByPerson = (personId: number) => {
  return db.getAllSync(`
    SELECT i.*, c.name as category_name, c.emoji as category_emoji
    FROM incidents i
    JOIN categories c ON i.category_id = c.id
    WHERE i.person_id = ?
    ORDER BY i.timestamp DESC
  `, [personId]);
};

export const deleteIncident = (incidentId: number) => {
  db.runSync('DELETE FROM incidents WHERE id = ?', [incidentId]);
};

export const logIncident = (
  personId: number,
  categoryId: number,
  points: number,
  isMajor: boolean,
  note?: string
) => {
  const settings: any = getSettings();
  const majorMultiplier = settings?.major_multiplier || 3;
  const finalPoints = isMajor ? points * majorMultiplier : points;
  
  db.runSync(
    'INSERT INTO incidents (person_id, category_id, points, is_major, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [personId, categoryId, finalPoints, isMajor ? 1 : 0, note || null, new Date().toISOString()]
  );
};

export const updateCategoryWeight = (categoryId: number, newPoints: number) => {
  db.runSync('UPDATE categories SET default_points = ? WHERE id = ?', [newPoints, categoryId]);
};

export const addCustomCategory = (name: string, emoji: string, points: number, isPositive: boolean) => {
  db.runSync(
    'INSERT INTO categories (name, emoji, default_points, is_positive, is_custom) VALUES (?, ?, ?, ?, 1)',
    [name, emoji, points, isPositive ? 1 : 0]
  );
};

export const deleteCategory = (categoryId: number) => {
  db.runSync('DELETE FROM incidents WHERE category_id = ?', [categoryId]);
  db.runSync('DELETE FROM categories WHERE id = ?', [categoryId]);
};

export const resetPersonScore = (personId: number) => {
  db.runSync('DELETE FROM incidents WHERE person_id = ?', [personId]);
};

export const toggleFavorite = (personId: number) => {
  const person = db.getFirstSync<Person>('SELECT * FROM people WHERE id = ?', [personId]);
  const newFavoriteStatus = person?.is_favorite ? 0 : 1;
  db.runSync('UPDATE people SET is_favorite = ? WHERE id = ?', [newFavoriteStatus, personId]);
};

export const getDatabase = () => {
  return SQLite.openDatabaseSync('logifyer.db');
};

// ============ CUSTOM RELATIONSHIP TYPES ============

export const initRelationshipTypes = () => {
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

  console.log('Relationship types initialized');
};

export const getAllRelationshipTypes = () => {
  // Custom types first (newest first), then defaults
  return db.getAllSync('SELECT * FROM relationship_types ORDER BY is_custom DESC, id DESC');
};

export const getCustomRelationshipTypesCount = () => {
  const result = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM relationship_types WHERE is_custom = 1'
  );
  return result?.count || 0;
};

export const addCustomRelationshipType = (type: string, emoji: string) => {
  const exists = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM relationship_types WHERE type = ?',
    [type]
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
    [type, emoji]
  );
};

export const deleteCustomRelationshipType = (type: string) => {
  // Only delete if it's custom
  db.runSync('DELETE FROM relationship_types WHERE type = ? AND is_custom = 1', [type]);
};

export const getPersonTrend = (personId: number): 'improving' | 'declining' | 'stable' | 'new' => {
  const incidents = db.getAllSync(
    'SELECT points FROM incidents WHERE person_id = ? ORDER BY timestamp DESC',
    [personId]
  ) as any[];

  if (incidents.length < 2) {
    return 'new';
  }

  const midpoint = Math.ceil(incidents.length / 2);
  const recent = incidents.slice(0, midpoint);
  const older = incidents.slice(midpoint);

  const recentAvg = recent.reduce((sum: number, i: any) => sum + i.points, 0) / recent.length;
  const olderAvg = older.reduce((sum: number, i: any) => sum + i.points, 0) / older.length;

  if (recentAvg > olderAvg + 2) return 'improving';
  if (recentAvg < olderAvg - 2) return 'declining';
  return 'stable';
};

export const checkPersonNameExists = (name: string) => {
  const result = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM people WHERE LOWER(name) = LOWER(?)',
    [name.trim()]
  );
  return (result?.count || 0) > 0;
};

export const deleteAllData = () => {
  try {
    // Delete all incidents
    db.runSync('DELETE FROM incidents');
    
    // Delete all people
    db.runSync('DELETE FROM people');
    
    // Delete custom categories only (keep default ones)
    db.runSync('DELETE FROM categories WHERE is_custom = 1');
    
    // Delete custom relationship types only (keep default ones)
    db.runSync('DELETE FROM relationship_types WHERE is_custom = 1');
    
    // Clear AI cache (if table exists)
    try {
      db.runSync('DELETE FROM ai_cache');
    } catch (e) {
      // Table doesn't exist yet, that's fine
      console.log('AI cache table does not exist, skipping');
    }
    
    console.log('All user data deleted successfully');
  } catch (error) {
    console.error('Error deleting all data:', error);
    throw error;
  }
};