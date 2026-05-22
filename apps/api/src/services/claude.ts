import fs from 'fs';
import path from 'path';
import type { TravelerProfile, ConversationStage } from '../types/profile';
import type { PersonalitySignals } from '../types/personality';

// ── Static system prompt (loaded from docs/CHAT_SYSTEM_PROMPT.md) ─────────

function loadChatSystemPromptCore(): string {
  // Resolve relative to this file: apps/api/src/services/ → repo root → docs/
  const mdPath = path.resolve(__dirname, '../../../../docs/CHAT_SYSTEM_PROMPT.md');
  try {
    const raw = fs.readFileSync(mdPath, 'utf-8');
    // Extract everything inside the fenced code block labelled as the static core
    const match = raw.match(/```\n([\s\S]*?)\n```/);
    return match ? match[1].trim() : raw.trim();
  } catch (err) {
    console.warn('[Claude] Could not load CHAT_SYSTEM_PROMPT.md, using inline fallback:', (err as Error).message);
    return 'You are Rihla, a warm AI travel consultant for Saudi and GCC travelers.';
  }
}

const CHAT_SYSTEM_PROMPT_CORE = loadChatSystemPromptCore();

// ── Itinerary types ───────────────────────────────────────────────────────

export interface ItineraryActivity {
  title: string;
  description: string;
  duration: string;
  type: 'sightseeing' | 'dining' | 'transport' | 'leisure' | 'activity' | 'cultural' | 'shopping';
  tip?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  theme: string;
  morning: ItineraryActivity;
  afternoon: ItineraryActivity;
  evening: ItineraryActivity;
  accommodation: string;
  estimated_cost_sar: number;
}

export interface ItineraryData {
  title: string;
  tagline: string;
  destination: string;
  duration_days: number;
  budget_tier: string;
  total_estimated_cost_sar: number;
  highlights: string[];
  days: ItineraryDay[];
  practical_info: {
    best_time_to_visit: string;
    visa_info: string;
    currency: string;
    language: string;
    flight_info: string;
    tips: string[];
  };
  personalization_note: string;
}

let anthropic: import('@anthropic-ai/sdk').default | null = null;

async function getAnthropic(): Promise<import('@anthropic-ai/sdk').default> {
  if (!anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const MODEL = 'claude-sonnet-4-6';
const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';
const CONVERSATION_WINDOW = 20;

// ── Dynamic system prompt ─────────────────────────────────────────────────

function buildProfileSummary(profile: Partial<TravelerProfile>): string {
  const parts: string[] = [];

  if (profile.travel_archetype) parts.push(`Archetype: ${profile.travel_archetype}`);
  if (profile.group_type) {
    const groupDesc = profile.group_size
      ? `${profile.group_type} (${profile.group_size} people)`
      : profile.group_type;
    parts.push(`Traveling as: ${groupDesc}`);
  }
  if (profile.budget_tier) parts.push(`Budget tier: ${profile.budget_tier}`);
  if (profile.destinations_mentioned?.length) {
    parts.push(`Destinations mentioned: ${profile.destinations_mentioned.join(', ')}`);
  }
  if (profile.activities_preferred?.length) {
    parts.push(`Activities interested in: ${profile.activities_preferred.join(', ')}`);
  }
  if (profile.accommodation_preference) parts.push(`Prefers: ${profile.accommodation_preference}`);
  if (profile.food_restrictions?.length) parts.push(`Food needs: ${profile.food_restrictions.join(', ')}`);
  if (profile.decision_readiness) parts.push(`Decision readiness: ${profile.decision_readiness}`);

  return parts.length > 0 ? parts.join('\n') : 'No signals collected yet.';
}

function buildGapsSection(profile: Partial<TravelerProfile>, completeness: number): string {
  if (completeness >= 0.7) return '';

  const gaps: string[] = [];
  if (!profile.destinations_mentioned?.length) gaps.push('destination(s) they are considering');
  if (!profile.group_type) gaps.push('who they are traveling with');
  if (!profile.budget_tier) gaps.push('their budget comfort level');
  if (!profile.activities_preferred?.length) gaps.push('what activities excite them');
  if (!profile.accommodation_preference) gaps.push('preferred accommodation style');
  if (!profile.group_size && profile.group_type && profile.group_type !== 'solo') gaps.push('group size');

  if (gaps.length === 0) return '';
  return `\n[GAPS TO FILL NATURALLY]\nStill missing: ${gaps.slice(0, 2).join(' and ')}. Weave one question around these into the conversation.`;
}

function buildDynamicInstructions(
  profile: Partial<TravelerProfile>,
  stage: ConversationStage,
  completeness: number,
  messageCount: number
): string {
  const lines: string[] = [];

  // Tone calibration based on archetype
  if (profile.travel_archetype === 'luxury_seeker') {
    lines.push('- Speak with polish and sophistication. Reference exclusive experiences, not just "nice hotels".');
  } else if (profile.travel_archetype === 'adventurer') {
    lines.push('- Match their energy — be energetic and bold. Mention unique off-the-beaten-path angles.');
  } else if (profile.travel_archetype === 'family_protector') {
    lines.push('- Be warm and reassuring. Emphasize safety, kid-friendly options, ease of travel.');
  } else if (profile.travel_archetype === 'culture_vulture') {
    lines.push('- Go deeper on history, local customs, and authentic experiences. Avoid generic tourist traps.');
  } else if (profile.travel_archetype === 'beach_hedonist') {
    lines.push('- Focus on relaxation, sun, ocean. Keep things light and evocative.');
  } else if (profile.travel_archetype === 'romance_seeker') {
    lines.push('- Be evocative and intimate. Paint vivid scenes. Think sunsets, private moments, ambiance.');
  }

  // Budget calibration
  if (profile.budget_tier === 'lean' || profile.budget_tier === 'balanced') {
    lines.push('- Never suggest luxury brands unprompted. Focus on value and smart choices.');
  } else if (profile.budget_tier === 'ultra') {
    lines.push('- Ultra budget: think private transfers, Michelin dining, bespoke experiences.');
  }

  // Stage-specific
  if (stage === 'intake' && messageCount === 0) {
    lines.push('- This is the opening message. Give a warm, compelling greeting that invites them to share their dream. DO NOT ask multiple questions.');
  }
  if (stage === 'profiling') {
    lines.push(`- Profile is ${Math.round(completeness * 100)}% complete. Keep conversation natural while uncovering the missing signals.`);
  }
  if (stage === 'proposal') {
    lines.push('- Profile is rich enough to propose. Craft a vivid, specific proposal that makes them feel truly understood. Reference their exact signals.');
    if (profile.destinations_mentioned?.length) {
      lines.push(`- They mentioned ${profile.destinations_mentioned.join(', ')} — build around these.`);
    }
  }
  if (stage === 'booking') {
    lines.push('- They are ready to book. Be specific: suggest next steps, ask about travel dates, offer to connect with an agent.');
  }

  return lines.length > 0 ? `\n[DYNAMIC INSTRUCTIONS]\n${lines.join('\n')}` : '';
}

function buildDynamicSystemSection(
  profile: Partial<TravelerProfile>,
  stage: ConversationStage,
  messageCount: number
): string {
  const completeness = profile.profileCompleteness ?? 0;
  const profileSummary = buildProfileSummary(profile);
  const gapsSection = buildGapsSection(profile, completeness);
  const dynamicInstructions = buildDynamicInstructions(profile, stage, completeness, messageCount);

  return `[CURRENT TRAVELER PROFILE]
${profileSummary}
Conversation stage: ${stage} | Messages: ${messageCount} | Completeness: ${Math.round(completeness * 100)}%${gapsSection}${dynamicInstructions}`;
}

// ── Streaming chat ────────────────────────────────────────────────────────

export interface StreamChatOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile: Partial<TravelerProfile>;
  stage: ConversationStage;
  messageCount: number;
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => Promise<void>;
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const { messages, profile, stage, messageCount, onChunk, onComplete } = options;

  let fullText = '';

  const stream = await (await getAnthropic()).messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: 'text', text: CHAT_SYSTEM_PROMPT_CORE, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: buildDynamicSystemSection(profile, stage, messageCount) },
    ],
    messages: messages.slice(-CONVERSATION_WINDOW).map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }

  await onComplete(fullText);
}

// ── Signal extraction ─────────────────────────────────────────────────────

export interface ExtractionResult {
  archetype_signals: string[];
  budget_signals: string;
  destinations_mentioned: string[];
  activities_mentioned: string[];
  emotional_markers: string[];
  group_signals: string;
  group_size_signal: number | null;
  food_signals: string[];
  decision_readiness: string;
  accommodation_signals: string;
  spontaneity_signals: string;
  date_signals: string;
  // Personality dimension signals
  personality: PersonalitySignals;
}

const PERSONALITY_SIGNALS_FALLBACK: PersonalitySignals = {
  novelty_signals: [],
  social_signals: [],
  status_signals: [],
  planning_signals: [],
  sensory_signals: [],
  decision_stage_signal: 'unclear',
};

const EXTRACTION_FALLBACK: ExtractionResult = {
  archetype_signals: [],
  budget_signals: 'unclear',
  destinations_mentioned: [],
  activities_mentioned: [],
  emotional_markers: [],
  group_signals: 'unclear',
  group_size_signal: null,
  food_signals: [],
  decision_readiness: 'unclear',
  accommodation_signals: 'unclear',
  spontaneity_signals: 'unclear',
  date_signals: '',
  personality: PERSONALITY_SIGNALS_FALLBACK,
};

// ── Itinerary generation ──────────────────────────────────────────────────

function inferDuration(profile: Partial<TravelerProfile>): number {
  for (const signal of profile.date_signals ?? []) {
    const weeks = signal.match(/(\d+)\s*week/i);
    if (weeks) return Math.min(parseInt(weeks[1]) * 7, 14);
    const days = signal.match(/(\d+)\s*(day|night)/i);
    if (days) return Math.min(parseInt(days[1]), 14);
  }
  return profile.budget_tier === 'ultra' || profile.budget_tier === 'premium' ? 7 : 5;
}

export async function generateItinerary(profile: Partial<TravelerProfile>): Promise<ItineraryData> {
  const duration = inferDuration(profile);
  const primaryDest = profile.destinations_mentioned?.[0] ?? 'a destination they will love';

  const profileSummary = [
    `Archetype: ${profile.travel_archetype ?? 'not specified'}`,
    `Group: ${profile.group_type ?? 'not specified'}${profile.group_size ? ` (${profile.group_size} people)` : ''}`,
    `Budget tier: ${profile.budget_tier ?? 'balanced'}`,
    `Destinations: ${profile.destinations_mentioned?.join(', ') ?? primaryDest}`,
    `Activities preferred: ${profile.activities_preferred?.join(', ') || 'varied'}`,
    `Accommodation: ${profile.accommodation_preference ?? 'hotel'}`,
    `Food restrictions: ${profile.food_restrictions?.join(', ') || 'none'}`,
    `Timing signals: ${profile.date_signals?.join(', ') || 'flexible'}`,
    `Emotional markers: ${profile.emotional_markers?.join(', ') || 'none'}`,
  ].join('\n');

  const prompt = `You are a world-class travel itinerary designer specializing in Saudi and GCC travelers. Create a detailed, personalized ${duration}-day itinerary.

TRAVELER PROFILE:
${profileSummary}

Generate a ${duration}-day itinerary for ${primaryDest}. Be specific — name real hotels, restaurants, and attractions. Costs must be realistic in SAR (1 USD ≈ 3.75 SAR).

Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "title": "Compelling, specific journey title",
  "tagline": "One evocative sentence that speaks directly to their travel style",
  "destination": "City, Country",
  "duration_days": ${duration},
  "budget_tier": "${profile.budget_tier ?? 'balanced'}",
  "total_estimated_cost_sar": <realistic total for all travelers>,
  "highlights": ["5 signature experiences that define this trip"],
  "days": [
    {
      "day": 1,
      "title": "Descriptive day title",
      "theme": "OneWordTheme",
      "morning": {
        "title": "Activity name",
        "description": "Vivid 2-3 sentence description with sensory detail",
        "duration": "X hours",
        "type": "sightseeing",
        "tip": "One insider tip or practical note"
      },
      "afternoon": { "title": "", "description": "", "duration": "", "type": "dining", "tip": "" },
      "evening": { "title": "", "description": "", "duration": "", "type": "leisure", "tip": "" },
      "accommodation": "Specific hotel name, neighborhood",
      "estimated_cost_sar": <daily cost for all travelers>
    }
  ],
  "practical_info": {
    "best_time_to_visit": "Best months and why",
    "visa_info": "Saudi passport visa status — visa-free / on-arrival / e-visa with details",
    "currency": "Currency name, code, approx rate from 1 SAR",
    "language": "Official language(s) and English prevalence",
    "flight_info": "Nearest airport, airlines from RUH/JED, approx flight hours",
    "tips": ["5 practical tips specific to Saudi/GCC travelers visiting this destination"]
  },
  "personalization_note": "Warm, specific 2-sentence explanation of why this itinerary was crafted for them based on their exact signals"
}

Activity type must be one of: sightseeing, dining, transport, leisure, activity, cultural, shopping.
Generate all ${duration} days fully. Every field is required.`;

  const response = await (await getAnthropic()).messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Itinerary generation returned no valid JSON');

  return JSON.parse(jsonMatch[0]) as ItineraryData;
}

// ── Itinerary refinement ──────────────────────────────────────────────────

export async function refineItinerary(
  currentItinerary: ItineraryData,
  profile: Partial<TravelerProfile>,
  request: string
): Promise<ItineraryData> {
  const profileSummary = [
    `Archetype: ${profile.travel_archetype ?? 'not specified'}`,
    `Group: ${profile.group_type ?? 'not specified'}${profile.group_size ? ` (${profile.group_size} people)` : ''}`,
    `Budget tier: ${profile.budget_tier ?? 'balanced'}`,
    `Food restrictions: ${profile.food_restrictions?.join(', ') || 'none'}`,
  ].join('\n');

  const prompt = `You are refining an existing travel itinerary based on a user request. Honor the request precisely while preserving everything that still works.

TRAVELER PROFILE:
${profileSummary}

CURRENT ITINERARY (JSON):
${JSON.stringify(currentItinerary)}

USER'S REFINEMENT REQUEST:
"${request}"

REFINEMENT RULES:
- Apply the user's request directly. If they ask to swap a day, swap that day; if they ask for cheaper hotels, lower the accommodation tier; if they ask to extend the trip, add days.
- Do NOT rewrite the whole itinerary unless asked. Keep day titles, themes, and structure that the user didn't ask to change.
- Recalculate "total_estimated_cost_sar" based on the actual cost changes.
- Update "personalization_note" to briefly acknowledge what changed (1 sentence).
- Costs are realistic in SAR (1 USD ≈ 3.75 SAR).
- Activity type must be one of: sightseeing, dining, transport, leisure, activity, cultural, shopping.

Return ONLY the full updated itinerary in the same JSON structure as the input — no markdown, no explanation, no diff. Every field is required.`;

  const response = await (await getAnthropic()).messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Itinerary refinement returned no valid JSON');

  return JSON.parse(jsonMatch[0]) as ItineraryData;
}

// ── Signal extraction ─────────────────────────────────────────────────────

export async function extractProfileSignals(
  message: string,
  currentProfile: Partial<TravelerProfile>
): Promise<ExtractionResult> {
  const currentCtx = JSON.stringify({
    a: currentProfile.travel_archetype,
    b: currentProfile.budget_tier,
    g: currentProfile.group_type,
    d: currentProfile.destinations_mentioned,
  });

  const prompt = `Extract travel signals from this message. Return ONLY valid JSON, no markdown.

Message: "${message}"
Known profile: ${currentCtx}

{"archetype_signals":[],"budget_signals":"","destinations_mentioned":[],"activities_mentioned":[],"emotional_markers":[],"group_signals":"","group_size_signal":null,"food_signals":[],"decision_readiness":"","accommodation_signals":"","spontaneity_signals":"","date_signals":"","personality":{"novelty_signals":[],"social_signals":[],"status_signals":[],"planning_signals":[],"sensory_signals":[],"decision_stage_signal":"unclear"}}

Rules:
archetype_signals: subset of [explorer,luxury_seeker,culture_vulture,beach_hedonist,adventurer,family_protector,romance_seeker]
budget_signals: lean|balanced|premium|ultra|unclear
emotional_markers: subset of [excitement,hesitation,nostalgia,anxiety,wanderlust,indecision,urgency,relaxed,decisive]
group_signals: solo|couple|family|friends|unclear
group_size_signal: integer or null
decision_readiness: browsing|planning|ready_to_book|unclear
accommodation_signals: hotel|apartment|resort|boutique|unclear
spontaneity_signals: high|medium|low|unclear
date_signals: time reference string or ""
novelty_signals entries: novelty_seeker|comfort_seeker|neutral
social_signals entries: connector|solitary|neutral
status_signals entries: status_driven|experience_driven|neutral
planning_signals entries: structured_planner|spontaneous|neutral
sensory_signals entries: hedonist|intellectual|neutral
decision_stage_signal: dreaming|researching|comparing|committed|unclear`;

  try {
    const response = await (await getAnthropic()).messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return EXTRACTION_FALLBACK;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractionResult>;
    return {
      ...EXTRACTION_FALLBACK,
      ...parsed,
      personality: { ...PERSONALITY_SIGNALS_FALLBACK, ...(parsed.personality ?? {}) },
    } as ExtractionResult;
  } catch (err) {
    console.error('[Claude] extraction failed:', (err as Error).message);
    return EXTRACTION_FALLBACK;
  }
}
