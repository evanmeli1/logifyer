import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('logifyer.db');

export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_uri TEXT,
      relationship_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

  console.log('Database tables created');
};

export const seedCategories = () => {
  const count = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories WHERE is_custom = 0');
  
  if (count?.count === 0) {
    const defaults = [
      { name: 'Cancelled plans', emoji: '🚫', points: -5, positive: 0 },
      { name: 'Lied/deceived', emoji: '🤥', points: -10, positive: 0 },
      { name: 'Disrespected you', emoji: '😤', points: -10, positive: 0 },
      { name: 'Always late', emoji: '⏰', points: -2, positive: 0 },
      { name: 'Borrowed money unpaid', emoji: '💸', points: -5, positive: 0 },
      { name: 'Only reaches out needing something', emoji: '🙄', points: -5, positive: 0 },
      { name: 'Showed up when needed', emoji: '✅', points: 10, positive: 1 },
      { name: 'Actually listened', emoji: '👂', points: 5, positive: 1 },
      { name: 'Had your back', emoji: '🤝', points: 10, positive: 1 },
      { name: 'Supported you', emoji: '💪', points: 5, positive: 1 },
    ];

    defaults.forEach(cat => {
      db.runSync(
        'INSERT INTO categories (name, emoji, default_points, is_positive, is_custom) VALUES (?, ?, ?, ?, 0)',
        [cat.name, cat.emoji, cat.points, cat.positive]
      );
    });
    
    console.log('Default categories seeded');
  }
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
  const result = db.getFirstSync<{ total: number }>(
    'SELECT COALESCE(SUM(points), 0) as total FROM incidents WHERE person_id = ?',
    [personId]
  );
  return result?.total || 0;
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
  const finalPoints = isMajor ? points * 3 : points;
  db.runSync(
    'INSERT INTO incidents (person_id, category_id, points, is_major, note) VALUES (?, ?, ?, ?, ?)',
    [personId, categoryId, finalPoints, isMajor ? 1 : 0, note || null]
  );
};