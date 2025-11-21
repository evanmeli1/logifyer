import * as SQLite from 'expo-sqlite';
import { getCachedInsight, saveCachedInsight } from '../database/aiCache';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;

export interface AIInsightsResult {
  content: string;
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
  const db = SQLite.openDatabaseSync('logifyer.db'); // ✅ Open inside function
  
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