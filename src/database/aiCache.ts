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

// Configuration
const CACHE_CONFIG = {
  MAX_CACHE_ENTRIES_PER_PERSON: 10, // Limit cache size per person
  MAX_TOTAL_CACHE_ENTRIES: 100, // Global cache limit
  DEFAULT_EXPIRY_HOURS: 24,
  CLEANUP_THRESHOLD: 50, // Clean up when cache exceeds this many expired entries
};

export const initAICacheTable = (db: SQLite.SQLiteDatabase) => {
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
    
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_ai_cache_person ON ai_insight_cache(person_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_ai_cache_type ON ai_insight_cache(insight_type);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_insight_cache(expires_at);`);
    
    // Initial cleanup on table creation
    cleanupExpiredCache(db);
    
    console.log('✅ AI cache table initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing AI cache table:', error);
    throw new Error('Failed to initialize AI cache table');
  }
};

/**
 * Get cached insight if valid
 */
export const getCachedInsight = (
  db: SQLite.SQLiteDatabase,
  personId: number,
  insightType: string,
  currentIncidentCount?: number
): AIInsightCache | null => {
  // Validate inputs
  if (!db) {
    console.error('getCachedInsight: Database is null');
    return null;
  }

  if (!personId || personId <= 0) {
    console.error('getCachedInsight: Invalid person ID:', personId);
    return null;
  }

  if (!insightType || typeof insightType !== 'string') {
    console.error('getCachedInsight: Invalid insight type:', insightType);
    return null;
  }

  try {
    const now = new Date().toISOString();
    
    const result = db.getFirstSync<AIInsightCache>(
      `SELECT * FROM ai_insight_cache 
       WHERE person_id = ? 
       AND insight_type = ? 
       AND expires_at > ?
       ORDER BY created_at DESC 
       LIMIT 1`,
      [personId, insightType, now]
    );

    if (!result) {
      return null;
    }

    // Validate result has required fields
    if (!result.content || result.content.trim() === '') {
      console.warn('getCachedInsight: Empty content in cached result');
      invalidateCache(db, personId, insightType);
      return null;
    }

    // Check if cache is stale based on incident count
    if (currentIncidentCount !== undefined && result.incident_count_at_generation > 0) {
      const incidentDelta = Math.abs(currentIncidentCount - result.incident_count_at_generation);
      const changePercentage = (incidentDelta / result.incident_count_at_generation) * 100;
      
      // Invalidate if incidents changed by more than 20%
      if (changePercentage > 20) {
        console.log(`Cache stale: incident count changed by ${changePercentage.toFixed(1)}%`);
        invalidateCache(db, personId, insightType);
        return null;
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting cached insight:', error);
    return null;
  }
};

/**
 * Save insight to cache with validation and size limits
 */
export const saveCachedInsight = (
  db: SQLite.SQLiteDatabase,
  personId: number,
  insightType: string,
  content: string,
  incidentCount: number,
  expiryHours: number = CACHE_CONFIG.DEFAULT_EXPIRY_HOURS
): boolean => {
  // Validate inputs
  if (!db) {
    console.error('saveCachedInsight: Database is null');
    return false;
  }

  if (!personId || personId <= 0) {
    console.error('saveCachedInsight: Invalid person ID:', personId);
    return false;
  }

  if (!insightType || typeof insightType !== 'string') {
    console.error('saveCachedInsight: Invalid insight type:', insightType);
    return false;
  }

  if (!content || content.trim() === '') {
    console.error('saveCachedInsight: Content cannot be empty');
    return false;
  }

  if (incidentCount < 0) {
    console.error('saveCachedInsight: Incident count cannot be negative');
    return false;
  }

  if (expiryHours <= 0 || expiryHours > 720) { // Max 30 days
    console.error('saveCachedInsight: Invalid expiry hours:', expiryHours);
    return false;
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  
  try {
    // Use transaction for atomic operation
    db.withTransactionSync(() => {
      // Check and enforce cache size limits
      enforceCacheSizeLimits(db, personId);

      // Delete any existing cache for this person/type combination
      db.runSync(
        'DELETE FROM ai_insight_cache WHERE person_id = ? AND insight_type = ?',
        [personId, insightType]
      );

      // Insert new cache entry
      db.runSync(
        `INSERT INTO ai_insight_cache (
          person_id, 
          insight_type, 
          content, 
          incident_count_at_generation, 
          created_at, 
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [personId, insightType, content, incidentCount, now, expiresAt]
      );
    });

    console.log(`✅ Cached ${insightType} for person ${personId}`);
    
    // Trigger cleanup if needed (non-blocking)
    triggerCleanupIfNeeded(db);
    
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    return false;
  }
};

/**
 * Invalidate cache entries
 */
export const invalidateCache = (
  db: SQLite.SQLiteDatabase,
  personId: number,
  insightType?: string
): boolean => {
  if (!db) {
    console.error('invalidateCache: Database is null');
    return false;
  }

  if (!personId || personId <= 0) {
    console.error('invalidateCache: Invalid person ID:', personId);
    return false;
  }

  try {
    if (insightType) {
      db.runSync(
        'DELETE FROM ai_insight_cache WHERE person_id = ? AND insight_type = ?',
        [personId, insightType]
      );
      console.log(`Cache invalidated for person ${personId}, type ${insightType}`);
    } else {
      db.runSync(
        'DELETE FROM ai_insight_cache WHERE person_id = ?',
        [personId]
      );
      console.log(`All cache invalidated for person ${personId}`);
    }
    return true;
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return false;
  }
};

/**
 * Invalidate all caches for a person when incidents change significantly
 */
export const invalidateCacheOnIncidentChange = (
  db: SQLite.SQLiteDatabase,
  personId: number
): boolean => {
  return invalidateCache(db, personId);
};

/**
 * Clean up expired cache entries
 */
export const cleanupExpiredCache = (db: SQLite.SQLiteDatabase): number => {
  if (!db) {
    console.error('cleanupExpiredCache: Database is null');
    return 0;
  }

  try {
    const now = new Date().toISOString();
    
    // Count expired entries before deletion
    const countResult = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache WHERE expires_at <= ?',
      [now]
    );
    
    const expiredCount = countResult?.count || 0;
    
    if (expiredCount > 0) {
      db.runSync(
        'DELETE FROM ai_insight_cache WHERE expires_at <= ?',
        [now]
      );
      console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`);
    }
    
    return expiredCount;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
};

/**
 * Enforce cache size limits per person
 */
const enforceCacheSizeLimits = (db: SQLite.SQLiteDatabase, personId: number) => {
  try {
    // Check person's cache count
    const personCacheCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache WHERE person_id = ?',
      [personId]
    );

    if (personCacheCount && personCacheCount.count >= CACHE_CONFIG.MAX_CACHE_ENTRIES_PER_PERSON) {
      // Delete oldest entries for this person
      const toDelete = personCacheCount.count - CACHE_CONFIG.MAX_CACHE_ENTRIES_PER_PERSON + 1;
      db.runSync(
        `DELETE FROM ai_insight_cache 
         WHERE id IN (
           SELECT id FROM ai_insight_cache 
           WHERE person_id = ? 
           ORDER BY created_at ASC 
           LIMIT ?
         )`,
        [personId, toDelete]
      );
      console.log(`Removed ${toDelete} old cache entries for person ${personId}`);
    }

    // Check global cache count
    const totalCacheCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache'
    );

    if (totalCacheCount && totalCacheCount.count >= CACHE_CONFIG.MAX_TOTAL_CACHE_ENTRIES) {
      // Delete oldest entries globally
      const toDelete = totalCacheCount.count - CACHE_CONFIG.MAX_TOTAL_CACHE_ENTRIES + 10;
      db.runSync(
        `DELETE FROM ai_insight_cache 
         WHERE id IN (
           SELECT id FROM ai_insight_cache 
           ORDER BY created_at ASC 
           LIMIT ?
         )`,
        [toDelete]
      );
      console.log(`Removed ${toDelete} old cache entries globally`);
    }
  } catch (error) {
    console.error('Error enforcing cache size limits:', error);
  }
};

/**
 * Trigger cleanup if too many expired entries exist
 */
const triggerCleanupIfNeeded = (db: SQLite.SQLiteDatabase) => {
  try {
    const now = new Date().toISOString();
    const expiredCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache WHERE expires_at <= ?',
      [now]
    );

    if (expiredCount && expiredCount.count >= CACHE_CONFIG.CLEANUP_THRESHOLD) {
      console.log(`Triggering cleanup: ${expiredCount.count} expired entries found`);
      cleanupExpiredCache(db);
    }
  } catch (error) {
    console.error('Error checking cleanup threshold:', error);
  }
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = (db: SQLite.SQLiteDatabase): {
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
  entriesByType: Record<string, number>;
} | null => {
  if (!db) {
    console.error('getCacheStats: Database is null');
    return null;
  }

  try {
    const now = new Date().toISOString();

    const totalResult = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache'
    );

    const expiredResult = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache WHERE expires_at <= ?',
      [now]
    );

    const validResult = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM ai_insight_cache WHERE expires_at > ?',
      [now]
    );

    const typeResults = db.getAllSync<{ insight_type: string; count: number }>(
      'SELECT insight_type, COUNT(*) as count FROM ai_insight_cache GROUP BY insight_type'
    );

    const entriesByType: Record<string, number> = {};
    typeResults.forEach(result => {
      entriesByType[result.insight_type] = result.count;
    });

    return {
      totalEntries: totalResult?.count || 0,
      expiredEntries: expiredResult?.count || 0,
      validEntries: validResult?.count || 0,
      entriesByType,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};

/**
 * Clear all cache (useful for debugging or reset)
 */
export const clearAllCache = (db: SQLite.SQLiteDatabase): boolean => {
  if (!db) {
    console.error('clearAllCache: Database is null');
    return false;
  }

  try {
    db.runSync('DELETE FROM ai_insight_cache');
    console.log('🗑️ All cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
};