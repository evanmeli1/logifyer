import * as SQLite from 'expo-sqlite';
import { getCachedInsight, saveCachedInsight } from '../database/aiCache';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;

export interface AIInsightsResult {
  content: string;
  isCached: boolean;
  generatedAt: string;
}

export interface AIOverviewResult {
  summary: string;
  keyPatterns: string[];
  topConcern: string | null;
  topStrength: string | null;
  recommendation: string;
  isCached: boolean;
  generatedAt: string;
}

export const generatePersonInsights = async (
  personId: number,
  personName: string,
  incidents: any[],
  score: number,
  forceRegenerate: boolean = false
): Promise<AIInsightsResult> => {
  const db = SQLite.openDatabaseSync('logifyer.db');
  
  // Check cache first
  if (!forceRegenerate) {
    const cached = getCachedInsight(db, personId, 'person_insights');
    if (cached && cached.incident_count_at_generation === incidents.length) {
      return {
        content: cached.content,
        isCached: true,
        generatedAt: new Date(cached.created_at).toLocaleDateString(),
      };
    }
  }

  const negativeIncidents = incidents.filter(i => i.points < 0);
  const positiveIncidents = incidents.filter(i => i.points > 0);
  
  const incidentSummary = incidents.slice(0, 20).map(i => 
    `${i.category_name} (${i.points > 0 ? '+' : ''}${i.points}pts) ${i.note ? `- ${i.note}` : ''}`
  ).join('\n');

  const prompt = `Analyze this relationship data for ${personName}:

Current Score: ${score}/100
Total Incidents: ${incidents.length}
Negative: ${negativeIncidents.length}
Positive: ${positiveIncidents.length}

Recent incidents:
${incidentSummary}

Provide a brief analysis (3-4 sentences) covering:
1. Overall pattern or trend
2. One key red flag or positive sign
3. One actionable recommendation

Be direct, helpful, and empathetic. Don't use overly clinical language.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a relationship analyst providing helpful insights based on logged incidents. Be concise, direct, and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;
    
    // Save to cache
    saveCachedInsight(db, personId, 'person_insights', content, incidents.length, 24);

    return {
      content,
      isCached: false,
      generatedAt: new Date().toLocaleDateString(),
    };
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
};

export const generateOverviewInsights = async (
  peopleData: Array<{
    name: string;
    relationship_type: string;
    score: number;
    incidentCount: number;
    recentIncidents: any[];
  }>,
  totalIncidents: number,
  forceRegenerate: boolean = false
): Promise<AIOverviewResult> => {
  const db = SQLite.openDatabaseSync('logifyer.db');
  
  // Use person_id = 0 for overview cache (special case)
  const OVERVIEW_CACHE_ID = 0;
  
  // Check cache first
  if (!forceRegenerate) {
    const cached = getCachedInsight(db, OVERVIEW_CACHE_ID, 'overview_insights');
    if (cached && cached.incident_count_at_generation === totalIncidents) {
      try {
        const parsed = JSON.parse(cached.content);
        return {
          ...parsed,
          isCached: true,
          generatedAt: new Date(cached.created_at).toLocaleDateString(),
        };
      } catch (e) {
        // If parsing fails, regenerate
      }
    }
  }

  // Build summary of all relationships
  const relationshipSummaries = peopleData.map(p => {
    const recentSummary = p.recentIncidents.slice(0, 5).map(i => 
      `${i.category_name} (${i.points > 0 ? '+' : ''}${i.points})`
    ).join(', ');
    
    return `- ${p.name} (${p.relationship_type}): Score ${p.score}/100, ${p.incidentCount} incidents. Recent: ${recentSummary || 'None'}`;
  }).join('\n');

  const avgScore = peopleData.length > 0 
    ? Math.round(peopleData.reduce((sum, p) => sum + p.score, 0) / peopleData.length)
    : 0;

  const lowestScorePerson = peopleData.reduce((min, p) => p.score < min.score ? p : min, peopleData[0]);
  const highestScorePerson = peopleData.reduce((max, p) => p.score > max.score ? p : max, peopleData[0]);

  const prompt = `Analyze this overview of someone's relationships:

Total People Tracked: ${peopleData.length}
Total Incidents Logged: ${totalIncidents}
Average Relationship Score: ${avgScore}/100
Lowest Score: ${lowestScorePerson?.name} (${lowestScorePerson?.score})
Highest Score: ${highestScorePerson?.name} (${highestScorePerson?.score})

Individual Relationships:
${relationshipSummaries}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence overall assessment of their relationship health",
  "keyPatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "topConcern": "The most concerning relationship or pattern, or null if none",
  "topStrength": "Their healthiest relationship or best pattern, or null if none", 
  "recommendation": "One specific, actionable thing they should focus on"
}

Be direct, insightful, and empathetic. Focus on patterns across relationships, not just individual ones.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a relationship analyst providing helpful insights. Always respond with valid JSON only, no markdown or extra text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsed;
    try {
      // Clean up potential markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }
    
    // Save to cache (store as JSON string)
    saveCachedInsight(db, OVERVIEW_CACHE_ID, 'overview_insights', JSON.stringify(parsed), totalIncidents, 24);

    return {
      summary: parsed.summary,
      keyPatterns: parsed.keyPatterns || [],
      topConcern: parsed.topConcern,
      topStrength: parsed.topStrength,
      recommendation: parsed.recommendation,
      isCached: false,
      generatedAt: new Date().toLocaleDateString(),
    };
  } catch (error) {
    console.error('AI Overview Error:', error);
    throw error;
  }
};

export const generateConfrontationScript = async (
  personId: number,
  personName: string,
  selectedIncidents: any[]
): Promise<string> => {
  const incidentDetails = selectedIncidents.map((i, idx) => 
    `${idx + 1}. ${i.category_name}${i.is_major ? ' (MAJOR)' : ''}: ${i.note || 'No details'} [${new Date(i.timestamp).toLocaleDateString()}]`
  ).join('\n');

  const prompt = `Help someone prepare for a difficult conversation with ${personName}.

Issues to address:
${incidentDetails}

Provide:
1. A calm, non-accusatory opening statement (2-3 sentences)
2. Key talking points using "I feel" statements
3. What specific change or outcome to request
4. How to handle if they get defensive

Keep it constructive, empathetic, and focused on improvement. Format clearly with sections.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a communication coach helping users prepare for difficult conversations. Focus on non-violent communication and constructive dialogue.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
};