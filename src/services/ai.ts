import * as SQLite from 'expo-sqlite';
import { getCachedInsight, saveCachedInsight } from '../database/aiCache';
import { getDatabase } from '../database/db';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Configuration
const AI_CONFIG = {
  API_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second
  CACHE_EXPIRY_HOURS: 24,
  MAX_TOKENS_INSIGHTS: 300,
  MAX_TOKENS_OVERVIEW: 500,
  MAX_TOKENS_SCRIPT: 600,
};

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

/**
 * Validate API key is available
 */
const validateApiKey = (): void => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    throw new Error('OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
  }
};

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout: number = AI_CONFIG.API_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - AI service took too long to respond');
    }
    throw error;
  }
};

/**
 * Call OpenAI API with retry logic
 */
const callOpenAI = async (
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  retries: number = AI_CONFIG.MAX_RETRIES
): Promise<string> => {
  validateApiKey();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`AI API retry attempt ${attempt}/${retries}`);
        await new Promise(resolve => 
          setTimeout(resolve, AI_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1))
        );
      }

      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Don't retry on authentication errors
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
        }
        
        // Don't retry on rate limit errors (should wait longer)
        if (response.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again in a few minutes.');
        }
        
        throw new Error(
          errorData.error?.message || 
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Validate response structure
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('Invalid response from OpenAI - no choices returned');
      }

      if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Invalid response from OpenAI - no content in response');
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      lastError = error;
      console.error(`AI API attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on specific errors
      if (
        error.message.includes('Invalid API key') ||
        error.message.includes('rate limit') ||
        error.message.includes('timeout')
      ) {
        throw error;
      }
    }
  }

  throw lastError || new Error('AI API call failed after retries');
};

export const generatePersonInsights = async (
  personId: number,
  personName: string,
  incidents: any[],
  score: number,
  forceRegenerate: boolean = false
): Promise<AIInsightsResult> => {
  // Validate inputs
  if (!personId || personId <= 0) {
    throw new Error('Invalid person ID');
  }

  if (!personName || personName.trim().length === 0) {
    throw new Error('Person name is required');
  }

  if (!Array.isArray(incidents)) {
    throw new Error('Incidents must be an array');
  }

  if (score < 0 || score > 100) {
    throw new Error('Score must be between 0 and 100');
  }

  const db = getDatabase();
  
  // Check cache first
  if (!forceRegenerate && incidents.length > 0) {
    try {
      const cached = getCachedInsight(db, personId, 'person_insights', incidents.length);
      
      if (cached) {
        // Validate cached content
        if (cached.content && cached.content.trim().length > 0) {
          return {
            content: cached.content,
            isCached: true,
            generatedAt: new Date(cached.created_at).toLocaleDateString(),
          };
        } else {
          console.warn('Cached content is empty, regenerating');
        }
      }
    } catch (error) {
      console.error('Error checking cache:', error);
      // Continue to generate fresh if cache fails
    }
  }

  // Need at least some incidents for meaningful insights
  if (incidents.length === 0) {
    return {
      content: `${personName} is new to your tracking. Start logging interactions to get AI-powered insights about this relationship.`,
      isCached: false,
      generatedAt: new Date().toLocaleDateString(),
    };
  }

  const negativeIncidents = incidents.filter(i => i.points < 0);
  const positiveIncidents = incidents.filter(i => i.points > 0);
  
  const incidentSummary = incidents.slice(0, 20).map(i => 
    `${i.category_name} (${i.points > 0 ? '+' : ''}${i.points}pts)${i.note ? ` - ${i.note}` : ''}`
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
    const content = await callOpenAI(
      [
        {
          role: 'system',
          content: 'You are a relationship analyst providing helpful insights based on logged incidents. Be concise, direct, and actionable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      AI_CONFIG.MAX_TOKENS_INSIGHTS
    );

    // Validate content before caching
    if (!content || content.trim().length === 0) {
      throw new Error('AI returned empty response');
    }
    
    // Save to cache
    try {
      saveCachedInsight(
        db, 
        personId, 
        'person_insights', 
        content, 
        incidents.length, 
        AI_CONFIG.CACHE_EXPIRY_HOURS
      );
    } catch (cacheError) {
      console.error('Failed to cache insights:', cacheError);
      // Don't fail the request if caching fails
    }

    return {
      content,
      isCached: false,
      generatedAt: new Date().toLocaleDateString(),
    };
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('API key')) {
      throw new Error('AI insights are not configured properly. Please contact support.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Too many AI requests. Please try again in a few minutes.');
    } else if (error.message.includes('timeout')) {
      throw new Error('AI service is taking too long. Please try again.');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw new Error('Failed to generate insights. Please try again later.');
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
  // Validate inputs
  if (!Array.isArray(peopleData)) {
    throw new Error('People data must be an array');
  }

  if (totalIncidents < 0) {
    throw new Error('Total incidents cannot be negative');
  }

  const db = getDatabase();
  
  // Use person_id = 0 for overview cache (special case)
  const OVERVIEW_CACHE_ID = 0;
  
  // Check cache first
  if (!forceRegenerate && totalIncidents > 0) {
    try {
      const cached = getCachedInsight(db, OVERVIEW_CACHE_ID, 'overview_insights', totalIncidents);
      
      if (cached && cached.content) {
        try {
          const parsed = JSON.parse(cached.content);
          
          // Validate parsed structure
          if (parsed.summary && Array.isArray(parsed.keyPatterns)) {
            return {
              summary: parsed.summary,
              keyPatterns: parsed.keyPatterns,
              topConcern: parsed.topConcern || null,
              topStrength: parsed.topStrength || null,
              recommendation: parsed.recommendation || '',
              isCached: true,
              generatedAt: new Date(cached.created_at).toLocaleDateString(),
            };
          } else {
            console.warn('Cached overview has invalid structure, regenerating');
          }
        } catch (parseError) {
          console.error('Failed to parse cached overview:', parseError);
          // Continue to regenerate
        }
      }
    } catch (error) {
      console.error('Error checking overview cache:', error);
      // Continue to generate fresh
    }
  }

  // Need at least one person with incidents for meaningful overview
  if (peopleData.length === 0 || totalIncidents === 0) {
    return {
      summary: "You haven't tracked enough relationships yet. Start logging interactions to get an overview of your relationship patterns.",
      keyPatterns: [],
      topConcern: null,
      topStrength: null,
      recommendation: "Begin by adding people you interact with regularly and logging both positive and negative incidents.",
      isCached: false,
      generatedAt: new Date().toLocaleDateString(),
    };
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
    const content = await callOpenAI(
      [
        {
          role: 'system',
          content: 'You are a relationship analyst providing helpful insights. Always respond with valid JSON only, no markdown or extra text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      AI_CONFIG.MAX_TOKENS_OVERVIEW
    );

    // Parse JSON response
    let parsed;
    try {
      // Clean up potential markdown code blocks
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsed = JSON.parse(cleanedContent);
      
      // Validate required fields
      if (!parsed.summary || !Array.isArray(parsed.keyPatterns)) {
        throw new Error('Invalid AI response structure');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('AI returned an invalid response format. Please try again.');
    }
    
    // Save to cache (store as JSON string)
    try {
      saveCachedInsight(
        db, 
        OVERVIEW_CACHE_ID, 
        'overview_insights', 
        JSON.stringify(parsed), 
        totalIncidents, 
        AI_CONFIG.CACHE_EXPIRY_HOURS
      );
    } catch (cacheError) {
      console.error('Failed to cache overview:', cacheError);
      // Don't fail the request
    }

    return {
      summary: parsed.summary,
      keyPatterns: parsed.keyPatterns || [],
      topConcern: parsed.topConcern || null,
      topStrength: parsed.topStrength || null,
      recommendation: parsed.recommendation || '',
      isCached: false,
      generatedAt: new Date().toLocaleDateString(),
    };
  } catch (error: any) {
    console.error('AI Overview Error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('API key')) {
      throw new Error('AI insights are not configured properly. Please contact support.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Too many AI requests. Please try again in a few minutes.');
    } else if (error.message.includes('timeout')) {
      throw new Error('AI service is taking too long. Please try again.');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    } else if (error.message.includes('invalid response format')) {
      throw error; // Already user-friendly
    }
    
    throw new Error('Failed to generate overview. Please try again later.');
  }
};

export const generateConfrontationScript = async (
  personId: number,
  personName: string,
  selectedIncidents: any[]
): Promise<string> => {
  // Validate inputs
  if (!personId || personId <= 0) {
    throw new Error('Invalid person ID');
  }

  if (!personName || personName.trim().length === 0) {
    throw new Error('Person name is required');
  }

  if (!Array.isArray(selectedIncidents) || selectedIncidents.length === 0) {
    throw new Error('At least one incident must be selected');
  }

  if (selectedIncidents.length > 10) {
    throw new Error('Too many incidents selected. Please select 10 or fewer key incidents.');
  }

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
    const content = await callOpenAI(
      [
        {
          role: 'system',
          content: 'You are a communication coach helping users prepare for difficult conversations. Focus on non-violent communication and constructive dialogue.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      AI_CONFIG.MAX_TOKENS_SCRIPT
    );

    if (!content || content.trim().length === 0) {
      throw new Error('AI returned empty response');
    }

    return content;
  } catch (error: any) {
    console.error('AI Script Error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('API key')) {
      throw new Error('AI insights are not configured properly. Please contact support.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Too many AI requests. Please try again in a few minutes.');
    } else if (error.message.includes('timeout')) {
      throw new Error('AI service is taking too long. Please try again.');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw new Error('Failed to generate conversation script. Please try again later.');
  }
};