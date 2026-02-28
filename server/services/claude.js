import Anthropic from '@anthropic-ai/sdk';

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function buildSystemPrompt(trip, dayEntry, weather) {
  const weatherStr = weather
    ? `\nToday's weather: ${weather.description}, ${weather.tempMin}°C–${weather.tempMax}°C, ${weather.pop}% chance of rain, humidity ${weather.humidity}%.`
    : '';

  const activitiesStr = dayEntry?.activities?.length
    ? `\nPlanned activities:\n${dayEntry.activities.map((a) => `- ${a.time ? a.time + ': ' : ''}${a.name}${a.notes ? ' (' + a.notes + ')' : ''}`).join('\n')}`
    : '\nNo activities planned yet.';

  const accommodationStr = dayEntry?.accommodation
    ? `\nStaying at: ${dayEntry.accommodation.name}${dayEntry.accommodation.address ? ', ' + dayEntry.accommodation.address : ''}`
    : '';

  const travelersStr = trip?.travelers?.length
    ? `\nTravelers: ${trip.travelers.join(', ')}`
    : '';

  return `You are Trip Wizard, an expert travel assistant helping travelers have the best possible trip experience.

Current trip details:
- Trip: ${trip?.name || 'Unknown Trip'}
- Destination: ${trip?.destination || 'Unknown'}
- Date: ${dayEntry?.date || 'Today'}
- Location today: ${dayEntry?.location || trip?.destination || 'Unknown'}${travelersStr}${accommodationStr}${activitiesStr}${weatherStr}

Your role:
- Provide specific, actionable advice tailored to the current location and date
- Suggest restaurants, attractions, and activities based on weather and time of day
- Help optimize the day's schedule if asked
- Provide local tips, cultural insights, and practical information
- Be concise but warm and helpful
- When recommending specific places, mention if they're best visited at certain times`;
}

export async function chatWithAssistant({ messages, trip, dayEntry, weather }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your_anthropic_api_key_here') {
    return getMockResponse(messages[messages.length - 1]?.content || '');
  }

  const systemPrompt = buildSystemPrompt(trip, dayEntry, weather);

  // Convert to Anthropic message format
  const formattedMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: formattedMessages,
  });

  return {
    content: response.content[0].text,
    usage: response.usage,
  };
}

export async function optimizeSchedule({ dayEntry, weather, places }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your_anthropic_api_key_here') {
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

Please return a JSON object with this exact structure:
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

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return getMockOptimizedSchedule(dayEntry);
}

function getMockResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('restaurant') || lower.includes('eat') || lower.includes('food')) {
    return {
      content:
        "Great question! Based on your location, I'd recommend checking out local restaurants near your accommodation. For tonight, look for places with outdoor seating if the weather holds up. Ask your hotel for recommendations — locals always know the hidden gems! *(Note: Connect your Anthropic API key for personalized AI-powered suggestions.)*",
      isMock: true,
    };
  }
  if (lower.includes('weather')) {
    return {
      content:
        "Based on today's forecast, it looks like a great day to explore! I'd suggest outdoor activities in the morning when it's cooler, and save any indoor sights for the afternoon. *(Note: Connect your Anthropic API key for real AI responses.)*",
      isMock: true,
    };
  }
  return {
    content:
      "I'm your Trip Wizard assistant! I can help you plan your day, find great restaurants, suggest activities based on the weather, and optimize your schedule. What would you like to know? *(Note: Add your Anthropic API key in .env to enable real AI responses.)*",
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
    summary:
      'Schedule optimized to minimize crowd overlap and take advantage of morning weather windows.',
    tips: ['Start early to avoid crowds', 'Book restaurants in advance for dinner', 'Check opening hours before visiting'],
    isMock: true,
  };
}
