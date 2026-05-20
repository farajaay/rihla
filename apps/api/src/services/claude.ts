import Anthropic from '@anthropic-ai/sdk';
import type { TravelerProfile, ConversationStage } from '../types/profile';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';

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

function buildSystemPrompt(
  profile: Partial<TravelerProfile>,
  stage: ConversationStage,
  messageCount: number
): string {
  const completeness = profile.profileCompleteness ?? 0;
  const profileSummary = buildProfileSummary(profile);
  const gapsSection = buildGapsSection(profile, completeness);
  const dynamicInstructions = buildDynamicInstructions(profile, stage, completeness, messageCount);

  return `[RIHLA PERSONA LAYER]
You are Rihla, a warm and perceptive AI travel consultant. Your name means "journey" in Arabic.
You speak with genuine curiosity and deep travel knowledge. You sound like a brilliant friend who has been everywhere — not like a booking form or a chatbot.
You support Arabic and English. Match the user's language exactly. If they write Arabic, respond in Arabic.

[CURRENT TRAVELER PROFILE]
${profileSummary}
Conversation stage: ${stage} | Messages so far: ${messageCount} | Profile completeness: ${Math.round(completeness * 100)}%
${gapsSection}

[ABSOLUTE BEHAVIORAL RULES]
- Ask ONLY ONE question per response. Never list questions.
- Always acknowledge what the user just shared before asking anything.
- Never mention profiling, data collection, or AI systems.
- Do not repeat information the user already gave you.
- If they seem hesitant, slow down — don't push.
- Short user replies = match their brevity. Long replies = be more expansive.

[SAUDI & GCC TRAVELER CONTEXT]
- Common departure hubs: Jeddah (JED), Riyadh (RUH), Dammam (DMM).
- Eid travel surges: book 3+ months early. National Day (Sep 23) surge.
- Saudi passport: visa-free or on-arrival in ~80 countries. Mention relevant visa info proactively.
- Halal food and prayer space availability matter to many travelers — raise naturally if signals present.
- Popular patterns: Europe (summer), Maldives (couples/honeymoon), Thailand/Bali (families), London (shopping + culture).
${dynamicInstructions}`;
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
  const systemPrompt = buildSystemPrompt(profile, stage, messageCount);

  let fullText = '';

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
}

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
};

export async function extractProfileSignals(
  message: string,
  currentProfile: Partial<TravelerProfile>
): Promise<ExtractionResult> {
  const prompt = `You are a behavioral profiling engine for a travel platform. Analyze this traveler message and extract structured signals. Return ONLY valid JSON — no markdown, no explanation.

User message: "${message}"
Current profile: ${JSON.stringify({
    archetype: currentProfile.travel_archetype,
    budget: currentProfile.budget_tier,
    group: currentProfile.group_type,
    destinations: currentProfile.destinations_mentioned,
  })}

Return this exact structure:
{
  "archetype_signals": [],
  "budget_signals": "",
  "destinations_mentioned": [],
  "activities_mentioned": [],
  "emotional_markers": [],
  "group_signals": "",
  "group_size_signal": null,
  "food_signals": [],
  "decision_readiness": "",
  "accommodation_signals": "",
  "spontaneity_signals": "",
  "date_signals": ""
}

Field rules:
- archetype_signals: subset of ["explorer","luxury_seeker","culture_vulture","beach_hedonist","adventurer","family_protector","romance_seeker"]
- budget_signals: one of ["lean","balanced","premium","ultra","unclear"]
- destinations_mentioned: exact place names mentioned (city, country, region)
- activities_mentioned: specific activities mentioned (hiking, snorkeling, museums, etc.)
- emotional_markers: subset of ["excitement","hesitation","nostalgia","anxiety","wanderlust","indecision","urgency","relaxed","decisive"]
- group_signals: one of ["solo","couple","family","friends","unclear"]
- group_size_signal: integer if mentioned explicitly, null otherwise
- food_signals: dietary needs mentioned (halal, vegetarian, seafood lover, etc.)
- decision_readiness: one of ["browsing","planning","ready_to_book","unclear"]
- accommodation_signals: one of ["hotel","apartment","resort","boutique","unclear"]
- spontaneity_signals: one of ["high","medium","low","unclear"]
- date_signals: any time reference ("next summer", "Eid", "December", "3 weeks") or empty string`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return EXTRACTION_FALLBACK;

    return { ...EXTRACTION_FALLBACK, ...JSON.parse(jsonMatch[0]) } as ExtractionResult;
  } catch (err) {
    console.error('[Claude] extraction failed:', (err as Error).message);
    return EXTRACTION_FALLBACK;
  }
}
