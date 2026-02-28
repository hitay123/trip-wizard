import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// Models to try in order — tested against this API key
const CHAT_MODELS = ['gemini-2.5-flash', 'gemini-flash-lite-latest'];
const OPTIMIZER_MODEL = 'gemini-2.5-flash';

function isQuotaError(err) {
  const msg = err?.message || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
}

function buildSystemPrompt(trip, dayEntry, weather) {
  const weatherStr = weather
    ? `\nToday's weather: ${weather.description}, ${weather.tempMin}°C–${weather.tempMax}°C, ${weather.pop}% chance of rain, humidity ${weather.humidity}%.`
    : '';

  const activitiesStr = dayEntry?.activities?.length
    ? `\nToday's planned activities:\n${dayEntry.activities.map((a) => `- ${a.time ? a.time + ': ' : ''}${a.name}${a.notes ? ' (' + a.notes + ')' : ''}`).join('\n')}`
    : '\nNo activities planned for today yet.';

  const accommodationStr = dayEntry?.accommodation
    ? `\nStaying at: ${dayEntry.accommodation.name}${dayEntry.accommodation.address ? ', ' + dayEntry.accommodation.address : ''}`
    : '';

  const travelersStr = trip?.travelers?.length
    ? `\nTravelers: ${trip.travelers.join(', ')}`
    : '';

  // Show already-planned days so the AI knows what exists
  const plannedDays = trip?.days?.length
    ? `\nAlready planned days:\n${trip.days.map((d) => `- ${d.date}: ${d.location} (${d.activities?.length || 0} activities)`).join('\n')}`
    : '\nNo days planned yet.';

  // Compute unplanned dates within the trip window
  let unplannedDates = '';
  if (trip?.startDate && trip?.endDate) {
    const planned = new Set((trip.days || []).map((d) => d.date));
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const available = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      if (!planned.has(ds)) available.push(ds);
    }
    unplannedDates = available.length
      ? `\nAvailable (unplanned) dates: ${available.join(', ')}`
      : '\nAll dates in the trip range are already planned.';
  }

  const planInstructions = `

## Generating Trip Plans
When the user asks you to create a plan, itinerary, schedule, add activities, or add days, respond with a brief intro AND include THREE different plan variations at the END of your response, each with a different style/budget/pace. Choose label names that capture the key difference (e.g., "Budget & Relaxed", "Cultural & Active", "Luxury & Indulgent" — or "Rainy Day Indoor", "Outdoor Adventure", "Local Hidden Gems" depending on context).

Wrap all three in [PLANS_START] and [PLANS_END] markers:

[PLANS_START]
[
  {
    "label": "Budget & Relaxed",
    "plan": {
      "title": "Short plan title",
      "days": [
        {
          "date": "YYYY-MM-DD",
          "location": "City / area",
          "accommodation": { "name": "Hotel or hostel name" },
          "activities": [
            { "name": "Activity name", "time": "HH:MM", "duration": 90, "notes": "Brief tip" }
          ],
          "notes": "Theme or summary for the day"
        }
      ]
    }
  },
  {
    "label": "Cultural & Active",
    "plan": { "title": "...", "days": [...] }
  },
  {
    "label": "Luxury & Indulgent",
    "plan": { "title": "...", "days": [...] }
  }
]
[PLANS_END]

Rules for each plan:
- Only use dates from the "Available (unplanned) dates" list above
- Use the trip's destination and known locations
- Include 3–6 realistic activities per day with sensible times (09:00–21:00)
- Duration is in minutes
- Make the three plans genuinely distinct: vary the cost, pace, activity types, and experiences
- Adapt labels to what was requested: if weather-related, vary by indoor/outdoor; if budget was mentioned, vary by cost; otherwise vary by experience style
- The user will review and choose which plan to add to their itinerary`;

  return `You are Trip Wizard, an expert travel assistant helping travelers have the best possible experience.

Trip: ${trip?.name || 'Unknown Trip'}
Destination: ${trip?.destination || 'Unknown'}
Dates: ${trip?.startDate || '?'} → ${trip?.endDate || '?'}${travelersStr}
Viewing day: ${dayEntry?.date || 'overview'}
Location today: ${dayEntry?.location || trip?.destination || 'Unknown'}${accommodationStr}${activitiesStr}${weatherStr}
${plannedDays}${unplannedDates}

Your role:
- Give specific, actionable advice for the current location and date
- Suggest restaurants, attractions, and activities based on weather and time of day
- Provide local tips and practical information
- Be concise but warm and helpful${planInstructions}`;
}

export async function chatWithAssistant({ messages, trip, dayEntry, weather }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return getMockResponse(messages[messages.length - 1]?.content || '');
  }

  const systemPrompt = buildSystemPrompt(trip, dayEntry, weather);

  // Gemini uses 'user'/'model' roles; split history from the last message
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1].content;

  // Try each model in order until one succeeds
  for (let i = 0; i < CHAT_MODELS.length; i++) {
    const modelName = CHAT_MODELS[i];
    try {
      const model = getClient().getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage);
      const raw = result.response.text();
      return parsePlanFromResponse(raw);
    } catch (err) {
      const isLast = i === CHAT_MODELS.length - 1;
      if (isQuotaError(err) && !isLast) {
        console.warn(`[Gemini] ${modelName} quota exceeded, trying ${CHAT_MODELS[i + 1]}…`);
        continue;
      }
      if (isQuotaError(err)) {
        console.warn('[Gemini] All models quota exceeded, falling back to mock');
        return {
          content:
            "I'm temporarily rate-limited by the Gemini API (quota exceeded). Please try again in a few minutes. In the meantime, check out the **Places** tab for nearby recommendations!",
          rateLimited: true,
        };
      }
      throw err;
    }
  }
}

export async function optimizeSchedule({ dayEntry, weather }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return getMockOptimizedSchedule(dayEntry);
  }

  const activitiesList = dayEntry?.activities
    ?.map((a) => `- ${a.name}${a.time ? ' (preferred time: ' + a.time + ')' : ''}${a.duration ? ', ~' + a.duration + ' min' : ''}${a.notes ? ' - ' + a.notes : ''}`)
    .join('\n') || 'No activities listed';

  const weatherStr = weather
    ? `Weather: ${weather.description}, ${weather.tempMin}–${weather.tempMax}°C, ${weather.pop}% rain chance`
    : 'Weather: unknown';

  const prompt = `You are a schedule optimization expert. Given the following day's activities and conditions, create an optimal schedule.

Date: ${dayEntry?.date}
Location: ${dayEntry?.location}
${weatherStr}

Activities to schedule:
${activitiesList}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "optimizedSchedule": [
    {
      "time": "09:00",
      "activity": "Activity name",
      "duration": 90,
      "notes": "Why this time is optimal",
      "weatherSuitability": "high|medium|low",
      "crowdLevel": "low|medium|high"
    }
  ],
  "summary": "Brief explanation of the optimization logic",
  "tips": ["tip1", "tip2"]
}

Consider: opening hours (most museums open 9-10am), meal times, weather windows (outdoor activities when rain is least likely), crowd patterns (popular spots busy 11am-2pm and 4-6pm), travel time between locations.`;

  try {
    const model = getClient().getGenerativeModel({ model: OPTIMIZER_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn('[Gemini] Optimizer quota exceeded, using mock schedule');
      return getMockOptimizedSchedule(dayEntry);
    }
    throw err;
  }

  return getMockOptimizedSchedule(dayEntry);
}

function parsePlanFromResponse(text) {
  // Try multi-plan format first [PLANS_START]...[PLANS_END]
  const plansMatch = text.match(/\[PLANS_START\]([\s\S]*?)\[PLANS_END\]/);
  if (plansMatch) {
    try {
      const plansData = JSON.parse(plansMatch[1].trim());
      if (Array.isArray(plansData) && plansData.length > 0) {
        const content = text.replace(/\[PLANS_START\][\s\S]*?\[PLANS_END\]/, '').trim();
        return { content, plans: plansData };
      }
    } catch (e) {
      console.warn('[Gemini] Failed to parse plans JSON:', e.message);
    }
  }

  // Fallback: single plan format [PLAN_START]...[PLAN_END]
  const planMatch = text.match(/\[PLAN_START\]([\s\S]*?)\[PLAN_END\]/);
  if (!planMatch) return { content: text };
  let plan = null;
  try {
    plan = JSON.parse(planMatch[1].trim());
  } catch (e) {
    console.warn('[Gemini] Failed to parse plan JSON:', e.message);
  }
  const content = text.replace(/\[PLAN_START\][\s\S]*?\[PLAN_END\]/, '').trim();
  return { content, plan };
}

function getMockResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('restaurant') || lower.includes('eat') || lower.includes('food')) {
    return {
      content:
        "Great question! Based on your location, I'd recommend checking out local restaurants near your accommodation. For tonight, look for places with outdoor seating if the weather holds up. Ask your hotel for recommendations — locals always know the hidden gems! *(Note: Add your Gemini API key in .env to enable real AI responses.)*",
      isMock: true,
    };
  }
  if (lower.includes('weather')) {
    return {
      content:
        "Based on today's forecast, it looks like a great day to explore! I'd suggest outdoor activities in the morning when it's cooler, and save any indoor sights for the afternoon. *(Note: Add your Gemini API key in .env to enable real AI responses.)*",
      isMock: true,
    };
  }
  return {
    content:
      "I'm your Trip Wizard assistant! I can help you plan your day, find great restaurants, suggest activities based on the weather, and optimize your schedule. What would you like to know? *(Note: Add your Gemini API key in .env to enable real AI responses.)*",
    isMock: true,
  };
}

function getMockOptimizedSchedule(dayEntry) {
  const activities = dayEntry?.activities || [];
  const schedule = activities.map((a, i) => ({
    time: `${(9 + i * 2).toString().padStart(2, '0')}:00`,
    activity: a.name,
    duration: a.duration || 90,
    notes: 'Scheduled for optimal timing based on location and crowd patterns',
    weatherSuitability: 'high',
    crowdLevel: i === 0 ? 'low' : 'medium',
  }));

  if (schedule.length === 0) {
    schedule.push({
      time: '09:00',
      activity: 'Morning exploration',
      duration: 120,
      notes: 'Start early to beat the crowds',
      weatherSuitability: 'high',
      crowdLevel: 'low',
    });
  }

  return {
    optimizedSchedule: schedule,
    summary: 'Schedule optimized to minimize crowd overlap and take advantage of morning weather windows.',
    tips: ['Start early to avoid crowds', 'Book restaurants in advance for dinner', 'Check opening hours before visiting'],
    isMock: true,
  };
}
