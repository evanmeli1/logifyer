import * as SQLite from 'expo-sqlite';

export interface AIInsightCache {
  id: number;
  person_id: number;
  insight_type: 'person_insights' | 'confrontation_script' | 'weekly_summary';
  content: string;
  incident_count_at_generation: number;
  created_at: string;
  expires_at: string;
}

export const initAICacheTable = (db: SQLite.SQLiteDatabase) => {
  console.log('🔧 Creating ai_insight_cache table...');
  
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS ai_insight_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        insight_type TEXT NOT NULL,
        content TEXT NOT NULL,
        incident_count_at_generation INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ ai_insight_cache table created');
    
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_ai_cache_person ON ai_insight_cache(person_id);`);
    console.log('✅ Index idx_ai_cache_person created');
    
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_ai_cache_type ON ai_insight_cache(insight_type);`);
    console.log('✅ Index idx_ai_cache_type created');
    
    // Verify table exists
    const tables = db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table' AND name='ai_insight_cache';`);
    console.log('📋 Table verification:', tables);
    
  } catch (error) {
    console.error('❌ Error creating ai_insight_cache table:', error);
    throw error;
  }
};

export const getCachedInsight = (
  db: SQLite.SQLiteDatabase,
  personId: number,
  insightType: string
): AIInsightCache | null => {
  console.log('🔍 Looking for cached insight:', personId, insightType);
  try {
    const result = db.getFirstSync<AIInsightCache>(
      `SELECT * FROM ai_insight_cache 
       WHERE person_id = ? AND insight_type = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [personId, insightType]
    );
    console.log('📦 Cache result:', result ? 'Found' : 'Not found');
    return result || null;
  } catch (error) {
    console.error('❌ Error getting cached insight:', error);
    return null;
  }
};

export const saveCachedInsight = (
  db: SQLite.SQLiteDatabase,
  personId: number,
  insightType: string,
  content: string,
  incidentCount: number,
  expiryHours: number = 24
) => {
  console.log('💾 Saving insight to cache...');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  
  try {
    db.runSync(
      `INSERT INTO ai_insight_cache (person_id, insight_type, content, incident_count_at_generation, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [personId, insightType, content, incidentCount, now, expiresAt]
    );
    console.log('✅ Insight saved to cache');
  } catch (error) {
    console.error('❌ Error saving to cache:', error);
  }
};

export const invalidateCache = (
  db: SQLite.SQLiteDatabase,
  personId: number,
  insightType?: string
) => {
  if (insightType) {
    db.runSync(
      'DELETE FROM ai_insight_cache WHERE person_id = ? AND insight_type = ?',
      [personId, insightType]
    );
  } else {
    db.runSync(
      'DELETE FROM ai_insight_cache WHERE person_id = ?',
      [personId]
    );
  }
};