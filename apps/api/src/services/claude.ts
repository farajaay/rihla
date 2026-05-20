import Anthropic from '@anthropic-ai/sdk';
import type { TravelerProfile, ConversationStage } from '../types/profile';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';

function buildSystemPrompt(profile: Partial<TravelerProfile>, stage: ConversationStage, messageCount: number): string {
  const profileJson = JSON.stringify(profile, null, 2);
  const completeness = profile.profileCompleteness ?? 0;

  return `[RIHLA PERSONA LAYER]
You are Rihla, a warm and perceptive AI travel consultant. Your name means "journey" in Arabic. You speak with genuine curiosity and enthusiasm. You never sound like a chatbot or a form — you sound like a knowledgeable friend who happens to know travel deeply.

You support both Arabic and English. If the user writes in Arabic, respond in Arabic. If in English, respond in English. Match their tone and energy.

[PROFILE STATE INJECTION]
Current inferred traveler profile (use this to personalize every response):
${profileJson}

Profile completeness: ${Math.round(completeness * 100)}%
Conversation stage: ${stage}
Messages exchanged: ${messageCount}

[CONVERSATION STAGE RULES]
- intake: Warmly greet, make them feel heard. Ask one open question about their dream trip.
- profiling: Naturally gather information through conversation. Cover: destination wishes, travel companions, dates, budget feel, activity preferences, accommodation style. ONE question per turn.
- proposal: You have enough information. Signal that you're about to craft a personalized proposal.
- booking: Help them move toward action. Be specific about next steps.

[BEHAVIORAL RULES]
- Ask ONLY ONE question per response. Never list multiple questions.
- Mirror their language register (casual vs. formal).
- Acknowledge what they share before pivoting to the next question.
- If they mention a destination, express genuine curiosity about why that destination appeals to them.
- Never mention you are collecting data or building a profile.
- If they seem price-sensitive, don't lead with luxury options.
- If they seem spontaneous, match that energy.
- Halal food, prayer times, modest accommodation — raise naturally if signals suggest GCC/Muslim traveler.

[SAUDI CONTEXT LAYER]
- Be aware of Eid Al-Fitr and Eid Al-Adha blackout periods (book early advice).
- King Abdulaziz International Airport (JED) and King Fahd International (DMM) as common departure hubs.
- Saudi National Day travel surge (September 23).
- Visa requirements for Saudi passport holders — be proactively helpful.
- Common Saudi traveler preferences: Europe in summer, Southeast Asia for families, Maldives for couples.

[DYNAMIC INSTRUCTIONS]
${completeness < 0.3 ? '- Profile is sparse. Focus on understanding their dream trip vision before asking logistics.' : ''}
${completeness >= 0.3 && completeness < 0.7 ? '- Profile is building. Naturally fill in gaps around budget, group, and dates.' : ''}
${completeness >= 0.7 ? '- Profile is rich. Start weaving personalized suggestions into conversation. Prepare for proposal.' : ''}
${stage === 'proposal' ? '- Generate a specific, vivid proposal. Make them feel you truly understood them.' : ''}`;
}

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

export interface ExtractionResult {
  archetype_signals: string[];
  budget_signals: string;
  destinations_mentioned: string[];
  activities_mentioned: string[];
  emotional_markers: string[];
  group_signals: string;
  food_signals: string[];
  decision_readiness: string;
  accommodation_signals: string;
  spontaneity_signals: string;
}

export async function extractProfileSignals(
  message: string,
  currentProfile: Partial<TravelerProfile>
): Promise<ExtractionResult> {
  const prompt = `You are a behavioral profiling engine for a travel platform. Analyze this user message and extract structured signals about their travel preferences and psychology. Return ONLY valid JSON with no explanation or markdown.

User message: "${message}"

Current profile state: ${JSON.stringify(currentProfile)}

Extract and return this exact JSON structure:
{
  "archetype_signals": [],
  "budget_signals": "",
  "destinations_mentioned": [],
  "activities_mentioned": [],
  "emotional_markers": [],
  "group_signals": "",
  "food_signals": [],
  "decision_readiness": "",
  "accommodation_signals": "",
  "spontaneity_signals": ""
}

Rules:
- archetype_signals: from ["explorer","luxury_seeker","culture_vulture","beach_hedonist","adventurer","family_protector","romance_seeker"]
- budget_signals: one of ["lean","balanced","premium","ultra","unclear"]
- emotional_markers: from ["excitement","hesitation","nostalgia","anxiety","wanderlust","indecision","urgency","relaxed"]
- group_signals: one of ["solo","couple","family","friends","unclear"]
- decision_readiness: one of ["browsing","planning","ready_to_book","unclear"]
- accommodation_signals: one of ["hotel","apartment","resort","boutique","unclear"]
- spontaneity_signals: one of ["high","medium","low","unclear"]
- If unclear or not mentioned, use empty array [] or empty string ""`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      archetype_signals: [],
      budget_signals: 'unclear',
      destinations_mentioned: [],
      activities_mentioned: [],
      emotional_markers: [],
      group_signals: 'unclear',
      food_signals: [],
      decision_readiness: 'unclear',
      accommodation_signals: 'unclear',
      spontaneity_signals: 'unclear',
    };
  }

  return JSON.parse(jsonMatch[0]) as ExtractionResult;
}
