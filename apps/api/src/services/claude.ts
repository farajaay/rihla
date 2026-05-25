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

  // Archetype voice — specific, not generic
  const archetypeTone: Record<string, string> = {
    luxury_seeker: 'Speak with the quiet confidence of someone who has stayed in every category of property and knows the difference between "expensive" and "exceptional". Reference the specific, the rare, and the exclusive — not brand names for their own sake, but for what they represent in terms of access and experience. Your vocabulary is precise. You do not gush.',
    adventurer: 'Match their energy but stay specific. Bold is fine — vague is not. Name the pass, the canyon, the moment. Talk about the physical reality: the altitude, the terrain, what it feels like when you get there. This traveler can smell a generic suggestion from a distance.',
    family_protector: 'Warm, practical, specific. Name the family-tested detail — the kids\' club hours, the pool depth, whether the walk between the hotel and the beach is manageable with a stroller. Reassure without condescending. The parent asking is worried and excited in equal measure.',
    culture_vulture: 'Go deep. Name the dynasty, the architect, the century, the specific room in the museum. Surface the thing under the thing. This traveler reads before they travel — match their knowledge and then exceed it. No tourist-board descriptions.',
    beach_hedonist: 'Languid and specific. The exact blue of the water (not "crystal clear"). The temperature of the evening breeze. The sound of water on coral. What the cocktail tastes like at that hour. Make them feel the sun before they book.',
    romance_seeker: 'Intimate, cinematic, deliberate. Name the specific table, the specific hour, the specific light. Two people are going somewhere to feel something — help them feel it before they arrive. Private. Unhurried. Every detail chosen.',
    explorer: 'Knowledgeable but not patronizing. Point to what most travelers skip, and explain why it matters — not because it\'s "off the beaten path" (never say that) but because it\'s genuinely better. This traveler has done their research; your job is to have done more.',
  };

  if (profile.travel_archetype && archetypeTone[profile.travel_archetype]) {
    lines.push(`- VOICE: ${archetypeTone[profile.travel_archetype]}`);
  }

  // Budget calibration — specific
  if (profile.budget_tier === 'lean') {
    lines.push('- BUDGET: Lean. Name the specific affordable play — the guesthouse that is genuinely good, the market stall over the restaurant, the public ferry over the charter. Never apologize for the budget.');
  } else if (profile.budget_tier === 'balanced') {
    lines.push('- BUDGET: Balanced. Mid-range done well. Smart upgrades where they matter (the hotel location, the one special dinner). Skip luxury branding unprompted.');
  } else if (profile.budget_tier === 'premium') {
    lines.push('- BUDGET: Premium. Good properties, good guides, private when it matters. Not ultra-luxury unless asked.');
  } else if (profile.budget_tier === 'ultra') {
    lines.push('- BUDGET: Ultra. Private transfers, bespoke access, Michelin-caliber dining, properties with fewer than 30 rooms. Reference what money actually buys here in terms of experience — not just brand names.');
  }

  // Stage-specific
  if (stage === 'intake' && messageCount === 0) {
    lines.push('- OPENING: This is the first message. Give a greeting that is warm and specific — do NOT ask "where would you like to go?" or "what is your budget?". Ask about the feeling they are chasing, the kind of trip they have been imagining, or what their last journey was that felt right. One question. Make it count.');
  }
  if (stage === 'profiling') {
    lines.push(`- PROFILING: ${Math.round(completeness * 100)}% complete. Every question should feel like it came from genuine curiosity, not a form. Build on exactly what they last said.`);
    if (!profile.destinations_mentioned?.length) {
      lines.push('- DESTINATION GAP: No destination yet. If they seem open, consider surfacing a domestic Saudi destination (AlUla, Abha, Diriyah, Farasan, Wadi Disah) — frame it as "have you ever considered..." with one evocative specific detail to make it real.');
    }
  }
  if (stage === 'proposal') {
    lines.push('- PROPOSAL MODE: Stop gathering. You have enough. Write the proposal. Reference their exact words and signals. Name specific places, specific moments, specific details. Make them feel understood — not processed. This is the moment the whole conversation has been building toward.');
    if (profile.destinations_mentioned?.length) {
      lines.push(`- BUILD AROUND: ${profile.destinations_mentioned.join(', ')} — they named these. Do not generalize.`);
    }
  }
  if (stage === 'booking') {
    lines.push('- BOOKING: They are ready. Be concrete and calm: travel dates, next steps, offer to connect with a specialist. No more selling — just clear, confident execution.');
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

  const archetypeVoice: Record<string, string> = {
    luxury_seeker: `Write with the authority of someone who has stayed in every tier and knows what money actually buys.
      Descriptions: thread counts, the weight of silence in a suite, the difference between a pool with a view and a pool that IS the view.
      Tips: what the concierge knows that isn't in the brochure, private entrances, time-of-day access tricks.
      Avoid: luxury brand names as decoration. Name them only when the property genuinely earns it.`,
    adventurer: `Write with kinetic specificity — the reader should feel the altitude, the dust, the physical reality of being there.
      Descriptions: what the terrain actually looks like, what the body experiences, what the moment feels like when you arrive.
      Tips: the window before other travelers arrive, the local guide's name if it matters, what to pack for this specific challenge.
      Avoid: vague "adventure" framing. Every sentence names the actual thing.`,
    culture_vulture: `Write with intellectual depth — the dynasty, the period, the specific room, the object in the collection most people walk past.
      Descriptions: name the architect, the year, the influence, the story behind the story.
      Tips: the curator's name, the off-season access, the secondary site that puts the main one in context.
      Avoid: tourist-board facts. Go deeper or don't bother.`,
    family_protector: `Write with warm practicality — reassure and excite in equal measure.
      Descriptions: the pool depth, the walk time, the air conditioning quality, the kids' program hours, what the grandparents can do while the kids are occupied.
      Tips: the halal restaurant that is actually good, the prayer room that doesn't require a map, the age-appropriate timing for each activity.
      Avoid: anything that sounds like a brochure. Parents have seen through those.`,
    beach_hedonist: `Write with languid sensory precision — the exact blue of the water (not "crystal clear"), the temperature at 5pm versus 9am, the sound of coral under the hull.
      Descriptions: what the body experiences: the heat, the coolness, the weight of the sun, the specific quality of stillness.
      Tips: the reef that's best before the afternoon wind, the bar that faces west for sunset, the operator who does the early snorkel before boats arrive.
      Avoid: generic "beautiful beach" language. If it can apply to any beach, rewrite it.`,
    romance_seeker: `Write with cinematic intimacy — name the specific table, the specific light, the specific moment.
      Descriptions: private, unhurried, deliberate. Two people and what they will feel and say. The detail that will become the story they tell.
      Tips: the booking trick that gets the roof terrace, the restaurant that lets you linger, the timing that avoids crowds.
      Avoid: generic "romantic setting" language. Name the exact thing.`,
    explorer: `Write with confident specificity about what most travelers miss and why it matters.
      Descriptions: the neighborhood under the neighborhood, the route that inverts the usual approach, the reason this lesser-known site is actually the better one.
      Tips: the local transport that opens up access, the time of day or week that changes everything, the thing that is not in any guidebook.
      Avoid: "off the beaten path" (never use this phrase). Just describe what makes it better.`,
  };

  const voiceInstruction = profile.travel_archetype && archetypeVoice[profile.travel_archetype]
    ? `VOICE — writing for a ${profile.travel_archetype}:\n${archetypeVoice[profile.travel_archetype]}`
    : 'Write with precise sensory specificity throughout.';

  const isSaudiDomestic = /saudi|ksa|riyadh|jeddah|abha|alula|al-ula|diriyah|tabuk|farasan|hail|neom|asir/i.test(primaryDest);

  const prompt = `You are a travel writer of the highest order — part Condé Nast Traveller, part National Geographic, part person who actually lived in every place they write about. Your itineraries are not templates. They are the document a traveler reads and thinks: "this was written for me."

TRAVELER PROFILE:
${profileSummary}

${voiceInstruction}

${isSaudiDomestic ? `DOMESTIC SAUDI CONTEXT:
This is a domestic Saudi itinerary — treat it with the same prestige and depth as any international destination.
Saudi Arabia contains some of the world's least-seen extraordinary places. Write accordingly.
For practical_info: no visa needed (domestic), currency is SAR (no conversion needed), note Saudia/flynas routes from RUH/JED.
` : ''}
QUALITY MANDATE — enforced at every sentence:

BANNED (using any of these means a rewrite): stunning, beautiful, amazing, incredible, iconic, vibrant, hidden gem, paradise, breathtaking, world-class, unforgettable, magical, must-see, charming, picturesque, unique, one-of-a-kind, bucket list, off the beaten path, truly special

REQUIRED:
- Every activity names a specific real place: exact restaurant name with neighborhood, named gallery within the museum, specific market name and what it sells
- Descriptions are sensory and physical: what the traveler sees (specific, not "beautiful"), smells, hears, feels — not "you will visit X" but "this is what being at X is like"
- Every tip is non-obvious: the counter-intuitive timing, the off-menu item to order by name, the entrance most visitors don't know, the local detail that changes the experience
- Accommodation: real, named, existing properties — correct for the budget tier and location
- SAR costs are realistic (1 USD ≈ 3.75 SAR)

TITLES AND COPY — the standard:
✗ "Discover the wonders of ancient Petra"
✓ "The Siq at Petra is a 1.2km slot canyon that ends, with no warning, at the rose-red face of Al-Khazneh. Walk it at 6am before the tour groups and the silence is complete."

✗ "Enjoy authentic local cuisine"
✓ "Lunch at Najd Village in Diriyah — lamb mansaf in clay pots, eaten on low cushions in the shade of a mudbrick wall built in the 18th century"

✗ "Day 1: Explore the city"
✓ "Day 1: Montmartre Before the City Wakes — a morning in Paris's 18th arrondissement when the boulangeries are the only thing open and the Sacré-Cœur catches the first light"

Generate a ${duration}-day itinerary for ${primaryDest}.

Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "Specific, literary journey title — not 'Unforgettable X' but something that captures the precise character of this trip for this traveler",
  "tagline": "One sentence written directly to this traveler's archetype. Should make them feel seen.",
  "destination": "City, Country",
  "duration_days": ${duration},
  "budget_tier": "${profile.budget_tier ?? 'balanced'}",
  "total_estimated_cost_sar": <realistic total for the full group>,
  "highlights": ["5 experiences named with specificity — real places, real moments, not generic categories"],
  "days": [
    {
      "day": 1,
      "title": "Day title naming the neighborhood or experience character — not 'Arrival Day'",
      "theme": "OneWordTheme",
      "morning": {
        "title": "Named activity at a specific real place",
        "description": "2–3 sentences. Physical sensory reality of being there. Name the street, the smell, the quality of light, what they hear. Not what they 'will do' — what it is like.",
        "duration": "X hours",
        "type": "sightseeing",
        "tip": "One non-obvious, specific insider tip that changes the experience"
      },
      "afternoon": { "title": "", "description": "", "duration": "", "type": "dining", "tip": "" },
      "evening": { "title": "", "description": "", "duration": "", "type": "leisure", "tip": "" },
      "accommodation": "Real property name, specific neighborhood — e.g. 'Bab Al Shams Desert Resort, Al Marmoom Desert'",
      "estimated_cost_sar": <daily cost for all travelers>
    }
  ],
  "practical_info": {
    "best_time_to_visit": "Specific months with the concrete reason — weather window, local events, crowd levels",
    "visa_info": "Saudi passport holders: visa-free / on-arrival / e-visa — with specific entry process if needed",
    "currency": "Currency name and code, rate from 1 SAR",
    "language": "Official language(s), honest English prevalence by context",
    "flight_info": "Nearest airport, airlines operating from RUH/JED, real flight duration",
    "tips": ["5 non-obvious, GCC-specific practical tips — halal dining by name where possible, prayer room access, local customs that matter, transport specifics"]
  },
  "personalization_note": "2 sentences. Reference their specific signals — their archetype, group composition, what they said they wanted. The tone should be: I listened, I understood, I built this for you."
}

Activity type: sightseeing | dining | transport | leisure | activity | cultural | shopping
Generate all ${duration} days fully. Every field required. No placeholder text. No generic copy.`;

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

  const prompt = `You are refining an existing travel itinerary based on a user request. Honor the request precisely.

TRAVELER PROFILE:
${profileSummary}

CURRENT ITINERARY (JSON):
${JSON.stringify(currentItinerary)}

USER'S REFINEMENT REQUEST:
"${request}"

REFINEMENT RULES:
1. DESTINATION CHANGE: If the request mentions a different city, country, or region — treat this as a FULL DESTINATION REBUILD. Regenerate ALL of: every day's activities (morning/afternoon/evening), all accommodation names, all tips, practical_info (visa_info, currency, language, flight_info, best_time_to_visit, tips), highlights, title, tagline, and destination field. Preserve ONLY: group composition, budget tier, food restrictions, and duration_days. Do not leave any trace of the old destination.

2. PARTIAL CHANGE: If the request is scoped (swap a day, cheaper hotels, add a day, change an activity) — apply only that change. Keep everything else intact. Never rewrite what wasn't asked to change.

3. QUALITY — same standards as original generation:
   - Name real, specific places — no generic "a local restaurant"
   - Sensory descriptions — what it looks/smells/feels like
   - Zero generic words: no "stunning", "beautiful", "amazing", "iconic"

4. Recalculate "total_estimated_cost_sar" accurately after changes.
5. Update "personalization_note" to acknowledge the change in one sentence.
6. Costs realistic in SAR (1 USD ≈ 3.75 SAR).
7. Activity type must be one of: sightseeing, dining, transport, leisure, activity, cultural, shopping.

Return ONLY the full updated itinerary in the same JSON structure as the input — no markdown, no explanation. Every field is required.`;

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
