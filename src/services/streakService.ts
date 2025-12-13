import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/db';

// Add these columns to settings table
export const initStreakTracking = () => {
  const db = getDatabase();
  
  try {
    // Check if streak columns exist
    const columns = db.getAllSync<{ name: string }>("PRAGMA table_info(settings)");
    const columnNames = columns.map((c: any) => c.name);
    
    if (!columnNames.includes('streak_current')) {
      db.execSync(`ALTER TABLE settings ADD COLUMN streak_current INTEGER DEFAULT 0;`);
      console.log('✅ Added streak_current column');
    }
    
    if (!columnNames.includes('streak_longest')) {
      db.execSync(`ALTER TABLE settings ADD COLUMN streak_longest INTEGER DEFAULT 0;`);
      console.log('✅ Added streak_longest column');
    }
    
    if (!columnNames.includes('last_log_date')) {
      db.execSync(`ALTER TABLE settings ADD COLUMN last_log_date TEXT;`);
      console.log('✅ Added last_log_date column');
    }
  } catch (error) {
    console.error('Error initializing streak tracking:', error);
  }
};

// Get current streak data
export const getStreakData = (): {
  current: number;
  longest: number;
  lastLogDate: string | null;
} => {
  const db = getDatabase();
  
  try {
    const result = db.getFirstSync<{
      streak_current: number;
      streak_longest: number;
      last_log_date: string | null;
    }>('SELECT streak_current, streak_longest, last_log_date FROM settings WHERE id = 1');
    
    if (!result) {
      return { current: 0, longest: 0, lastLogDate: null };
    }
    
    return {
      current: result.streak_current || 0,
      longest: result.streak_longest || 0,
      lastLogDate: result.last_log_date || null,
    };
  } catch (error) {
    console.error('Error getting streak data:', error);
    return { current: 0, longest: 0, lastLogDate: null };
  }
};

// Update streak when user logs an incident
export const updateStreak = (): {
  current: number;
  longest: number;
  isNewRecord: boolean;
  milestoneReached: number | null;
} => {
  const db = getDatabase();
  
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const streakData = getStreakData();
    
    let newCurrent = streakData.current;
    let newLongest = streakData.longest;
    let isNewRecord = false;
    let milestoneReached: number | null = null;
    
    // Check if they logged today already
    if (streakData.lastLogDate === today) {
      // Already logged today, no streak change
      return {
        current: newCurrent,
        longest: newLongest,
        isNewRecord: false,
        milestoneReached: null,
      };
    }
    
    // Check if logged yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (streakData.lastLogDate === yesterdayStr) {
      // Logged yesterday, continue streak
      newCurrent = streakData.current + 1;
    } else if (streakData.lastLogDate === null) {
      // First time logging
      newCurrent = 1;
    } else {
      // Streak broken, start over
      newCurrent = 1;
    }
    
    // Check if new record
    if (newCurrent > newLongest) {
      newLongest = newCurrent;
      isNewRecord = true;
    }
    
    // Check milestones
    const milestones = [3, 7, 14, 30, 50, 100, 365];
    const previousStreak = streakData.current;
    
    for (const milestone of milestones) {
      if (newCurrent >= milestone && previousStreak < milestone) {
        milestoneReached = milestone;
        break;
      }
    }
    
    // Update database
    db.runSync(
      'UPDATE settings SET streak_current = ?, streak_longest = ?, last_log_date = ? WHERE id = 1',
      [newCurrent, newLongest, today]
    );
    
    return {
      current: newCurrent,
      longest: newLongest,
      isNewRecord,
      milestoneReached,
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    return {
      current: 0,
      longest: 0,
      isNewRecord: false,
      milestoneReached: null,
    };
  }
};

// Reset streak (optional - for testing or user request)
export const resetStreak = (): boolean => {
  const db = getDatabase();
  
  try {
    db.runSync(
      'UPDATE settings SET streak_current = 0, last_log_date = NULL WHERE id = 1'
      // Note: Don't reset streak_longest, it's their all-time record
    );
    return true;
  } catch (error) {
    console.error('Error resetting streak:', error);
    return false;
  }
};

// Get streak status for display
export const getStreakStatus = (): {
  current: number;
  longest: number;
  daysUntilBreak: number;
  emoji: string;
  message: string;
} => {
  const streakData = getStreakData();
  const today = new Date().toISOString().split('T')[0];
  
  let daysUntilBreak = 0;
  let emoji = '📝';
  let message = 'Start your streak!';
  
  if (streakData.lastLogDate === today) {
    // Logged today
    daysUntilBreak = 1;
    emoji = '✅';
    message = `${streakData.current} day streak! Come back tomorrow!`;
  } else if (streakData.lastLogDate) {
    // Check if streak is still alive
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (streakData.lastLogDate === yesterdayStr) {
      // Logged yesterday, need to log today
      daysUntilBreak = 0;
      emoji = '🔥';
      message = `${streakData.current} day streak! Don't break it!`;
    } else {
      // Streak broken
      daysUntilBreak = 0;
      emoji = '💔';
      message = 'Streak broken. Start a new one!';
    }
  }
  
  return {
    current: streakData.current,
    longest: streakData.longest,
    daysUntilBreak,
    emoji,
    message,
  };
};