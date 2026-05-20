import type { TravelerProfile, TravelArchetype, BudgetTier, ConversationStage } from '../types/profile';
import type { ExtractionResult } from './claude';
import prisma from './db';

// ── Ad segment derivation ─────────────────────────────────────────────────

function deriveAdSegments(profile: Partial<TravelerProfile>): string[] {
  const segments: string[] = [];

  // Budget
  if (profile.budget_tier === 'premium' || profile.budget_tier === 'ultra') {
    segments.push('high_income_traveler');
  }
  if (profile.budget_tier === 'lean' || profile.budget_tier === 'balanced') {
    segments.push('value_conscious_traveler');
  }

  // Group type
  const groupMap: Record<string, string> = {
    family: 'family_travel',
    couple: 'couples_travel',
    solo: 'solo_travel',
    friends: 'group_travel',
  };
  if (profile.group_type && groupMap[profile.group_type]) {
    segments.push(groupMap[profile.group_type]);
  }

  // Destination intent
  const dests = profile.destinations_mentioned?.map((d) => d.toLowerCase()) ?? [];
  const EUROPE = ['paris', 'london', 'rome', 'barcelona', 'amsterdam', 'istanbul', 'madrid', 'vienna', 'prague', 'zurich'];
  const SE_ASIA = ['bali', 'thailand', 'singapore', 'malaysia', 'vietnam', 'cambodia', 'indonesia', 'phuket', 'bangkok'];
  const GULF = ['dubai', 'abu dhabi', 'doha', 'muscat', 'bahrain'];

  if (dests.some((d) => EUROPE.some((e) => d.includes(e)))) segments.push('europe_intent');
  if (dests.some((d) => SE_ASIA.some((s) => d.includes(s)))) segments.push('southeast_asia_intent');
  if (dests.some((d) => d.includes('maldives'))) segments.push('maldives_intent');
  if (dests.some((d) => GULF.some((g) => d.includes(g)))) segments.push('gcc_regional_travel');

  // Accommodation
  if (profile.accommodation_preference === 'resort') segments.push('resort_likely');
  if (profile.accommodation_preference === 'boutique') segments.push('boutique_hotel_likely');
  if ((profile.budget_ceiling_sar ?? 0) > 50000) segments.push('luxury_hotel_likely');

  // Seasonality
  const month = new Date().getMonth();
  if (month >= 5 && month <= 8) segments.push('summer_travel');
  else if (month >= 11 || month <= 1) segments.push('winter_travel');
  else segments.push('shoulder_season_travel');

  // Dietary / cultural
  if (profile.food_restrictions?.some((f) => f.toLowerCase().includes('halal'))) {
    segments.push('halal_required', 'likely_muslim_traveler');
  }

  // Intent
  if (profile.decision_readiness === 'ready_to_book') segments.push('high_intent');
  else if (profile.decision_readiness === 'planning') segments.push('mid_intent');

  // Engagement
  if ((profile.engagement_score ?? 0) > 60) segments.push('highly_engaged');

  // Archetype
  if (profile.travel_archetype) segments.push(`archetype_${profile.travel_archetype}`);

  return [...new Set(segments)];
}

// ── Completeness scoring ──────────────────────────────────────────────────

const PROFILE_FIELDS: Array<(p: Partial<TravelerProfile>) => boolean> = [
  (p) => !!p.travel_archetype,
  (p) => !!p.group_type,
  (p) => !!p.budget_tier,
  (p) => (p.destinations_mentioned?.length ?? 0) > 0,
  (p) => !!p.decision_readiness,
  (p) => !!p.group_size,
  (p) => (p.activities_preferred?.length ?? 0) > 0,
  (p) => !!p.accommodation_preference,
];

function calculateCompleteness(profile: Partial<TravelerProfile>): number {
  const filled = PROFILE_FIELDS.filter((fn) => fn(profile)).length;
  return filled / PROFILE_FIELDS.length;
}

// ── Signal inference helpers ──────────────────────────────────────────────

function inferBudgetFromSignal(signal: string): BudgetTier | null {
  const map: Record<string, BudgetTier> = {
    lean: 'lean', balanced: 'balanced', premium: 'premium', ultra: 'ultra',
  };
  return map[signal] ?? null;
}

function inferArchetype(signals: string[]): TravelArchetype | null {
  const validArchetypes = new Set<string>([
    'explorer', 'luxury_seeker', 'culture_vulture',
    'beach_hedonist', 'adventurer', 'family_protector', 'romance_seeker',
  ]);

  const counts: Record<string, number> = {};
  for (const s of signals) {
    if (validArchetypes.has(s)) {
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? (top[0] as TravelArchetype) : null;
}

function coerceGroupType(signal: string): string | null {
  const valid = new Set(['solo', 'couple', 'family', 'friends']);
  return valid.has(signal) ? signal : null;
}

function coerceDecisionReadiness(signal: string): string | null {
  const valid = new Set(['browsing', 'planning', 'ready_to_book']);
  return valid.has(signal) ? signal : null;
}

function coerceAccommodation(signal: string): string | null {
  const valid = new Set(['hotel', 'apartment', 'resort', 'boutique']);
  return valid.has(signal) ? signal : null;
}

function calculateEngagementDelta(message: string): number {
  const base = Math.min(message.length / 8, 25);
  const questions = (message.match(/\?/g) ?? []).length * 4;
  const exclamations = (message.match(/!/g) ?? []).length * 2;
  const emojis = (message.match(/[\u{1F300}-\u{1F9FF}]/gu) ?? []).length * 3;
  return base + questions + exclamations + emojis;
}

// ── Profile update (main export) ─────────────────────────────────────────

export async function updateProfile(
  sessionId: string,
  extraction: ExtractionResult,
  userMessage: string
): Promise<Partial<TravelerProfile>> {
  const existing = await prisma.travelerProfile.findUnique({ where: { sessionId } });

  // Merge arrays
  const newDests = [...new Set([...(existing?.destinationsMentioned ?? []), ...extraction.destinations_mentioned])];
  const newActivities = [...new Set([...(existing?.activitiesPreferred ?? []), ...extraction.activities_mentioned])];
  const newFood = [...new Set([...(existing?.foodRestrictions ?? []), ...extraction.food_signals])];
  const newEmotions = [...new Set([...(existing?.emotionalMarkers ?? []), ...extraction.emotional_markers])];
  const newDates = extraction.date_signals
    ? [...new Set([...(existing?.dateSignals ?? []), extraction.date_signals])]
    : (existing?.dateSignals ?? []);

  // Scalar inference — keep existing value if new signal is unclear
  const archetype = inferArchetype(extraction.archetype_signals) ?? existing?.travelArchetype ?? null;
  const budgetTier = inferBudgetFromSignal(extraction.budget_signals) ?? existing?.budgetTier ?? null;
  const groupType = coerceGroupType(extraction.group_signals) ?? existing?.groupType ?? null;
  const groupSize = extraction.group_size_signal ?? existing?.groupSize ?? null;
  const decisionReadiness = coerceDecisionReadiness(extraction.decision_readiness) ?? existing?.decisionReadiness ?? null;
  const accommodationPref = coerceAccommodation(extraction.accommodation_signals) ?? existing?.accommodationPref ?? null;

  const engagementDelta = calculateEngagementDelta(userMessage);
  const newEngagement = (existing?.engagementScore ?? 0) + engagementDelta;

  const partialProfile: Partial<TravelerProfile> = {
    travel_archetype: archetype as any,
    budget_tier: budgetTier,
    group_type: groupType as any,
    group_size: groupSize,
    decision_readiness: decisionReadiness as any,
    accommodation_preference: accommodationPref as any,
    destinations_mentioned: newDests,
    activities_preferred: newActivities,
    food_restrictions: newFood,
    engagement_score: newEngagement,
  };

  const completeness = calculateCompleteness(partialProfile);
  const adSegments = deriveAdSegments({ ...partialProfile, profileCompleteness: completeness });
  const allSegments = [...new Set([...(existing?.adSegments ?? []), ...adSegments])];

  const upsertData = {
    travelArchetype: archetype,
    budgetTier,
    groupType,
    groupSize,
    decisionReadiness,
    accommodationPref,
    destinationsMentioned: newDests,
    activitiesPreferred: newActivities,
    foodRestrictions: newFood,
    emotionalMarkers: newEmotions,
    dateSignals: newDates,
    engagementScore: newEngagement,
    adSegments: allSegments,
    profileCompleteness: completeness,
  };

  await prisma.travelerProfile.upsert({
    where: { sessionId },
    create: { sessionId, ...upsertData },
    update: upsertData,
  });

  return {
    ...partialProfile,
    ad_segments: allSegments,
    profileCompleteness: completeness,
  };
}

// ── Stage determination ───────────────────────────────────────────────────

export function determineStage(
  profile: Partial<TravelerProfile>,
  messageCount: number
): ConversationStage {
  const completeness = profile.profileCompleteness ?? 0;
  if (messageCount === 0) return 'intake';
  if (profile.decision_readiness === 'ready_to_book') return 'booking';
  if (completeness >= 0.7 || messageCount >= 10) return 'proposal';
  return 'profiling';
}
