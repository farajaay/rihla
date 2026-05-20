import type { TravelerProfile, TravelArchetype, BudgetTier, ConversationStage } from '../types/profile';
import type { ExtractionResult } from './claude';
import prisma from './db';

const ARCHETYPE_WEIGHT: Record<string, number> = {
  explorer: 0, luxury_seeker: 0, culture_vulture: 0,
  beach_hedonist: 0, adventurer: 0, family_protector: 0, romance_seeker: 0,
};

function deriveAdSegments(profile: Partial<TravelerProfile>): string[] {
  const segments: string[] = [];

  if (profile.budget_tier === 'premium' || profile.budget_tier === 'ultra') {
    segments.push('high_income_traveler');
  }
  if (profile.group_type === 'family') segments.push('family_travel');
  if (profile.group_type === 'couple') segments.push('couples_travel');
  if (profile.group_type === 'solo') segments.push('solo_travel');

  const europeDests = ['paris', 'london', 'rome', 'barcelona', 'amsterdam', 'istanbul'];
  const destinations = profile.destinations_mentioned?.map((d) => d.toLowerCase()) ?? [];
  if (destinations.some((d) => europeDests.includes(d))) segments.push('europe_intent');

  const seAsiaDests = ['bali', 'thailand', 'singapore', 'malaysia', 'vietnam'];
  if (destinations.some((d) => seAsiaDests.some((s) => d.includes(s)))) segments.push('southeast_asia_intent');

  if (destinations.some((d) => d.includes('maldives'))) segments.push('maldives_intent');

  if ((profile.budget_ceiling_sar ?? 0) > 50000) segments.push('luxury_hotel_likely');

  const month = new Date().getMonth();
  if (month >= 5 && month <= 8) segments.push('summer_travel');
  if (month >= 11 || month <= 1) segments.push('winter_travel');

  if (profile.food_restrictions?.includes('halal')) segments.push('halal_required');

  if (profile.decision_readiness === 'ready_to_book') segments.push('high_intent');
  if (profile.engagement_score > 50) segments.push('highly_engaged');

  return [...new Set(segments)];
}

function calculateCompleteness(profile: Partial<TravelerProfile>): number {
  const fields = [
    profile.travel_archetype,
    profile.group_type,
    profile.budget_tier,
    profile.destinations_mentioned && profile.destinations_mentioned.length > 0,
    profile.decision_readiness,
    profile.group_size,
    profile.activities_preferred && profile.activities_preferred.length > 0,
    profile.accommodation_preference,
  ];
  const filled = fields.filter(Boolean).length;
  return filled / fields.length;
}

function inferBudgetFromSignal(signal: string): BudgetTier | null {
  const map: Record<string, BudgetTier> = {
    lean: 'lean', balanced: 'balanced', premium: 'premium', ultra: 'ultra',
  };
  return map[signal] ?? null;
}

function inferArchetype(signals: string[]): TravelArchetype | null {
  const counts: Record<string, number> = { ...ARCHETYPE_WEIGHT };
  for (const s of signals) {
    if (s in counts) counts[s]++;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? (top[0] as TravelArchetype) : null;
}

function calculateEngagementDelta(message: string): number {
  const baseScore = Math.min(message.length / 10, 20);
  const questionMarks = (message.match(/\?/g) ?? []).length * 5;
  const exclamations = (message.match(/!/g) ?? []).length * 3;
  return baseScore + questionMarks + exclamations;
}

export async function updateProfile(
  sessionId: string,
  extraction: ExtractionResult,
  userMessage: string
): Promise<Partial<TravelerProfile>> {
  const existing = await prisma.travelerProfile.findUnique({
    where: { sessionId },
  });

  const currentDests = existing?.destinationsMentioned ?? [];
  const currentActivities = existing?.activitiesPreferred ?? [];
  const currentFood = existing?.foodRestrictions ?? [];
  const currentSegments = existing?.adSegments ?? [];

  const newDests = [...new Set([...currentDests, ...extraction.destinations_mentioned])];
  const newActivities = [...new Set([...currentActivities, ...extraction.activities_mentioned])];
  const newFood = [...new Set([...currentFood, ...extraction.food_signals])];

  const engagementDelta = calculateEngagementDelta(userMessage);
  const newEngagement = (existing?.engagementScore ?? 0) + engagementDelta;

  const archetype = inferArchetype(extraction.archetype_signals) ?? existing?.travelArchetype ?? null;
  const budgetTier = inferBudgetFromSignal(extraction.budget_signals) ?? existing?.budgetTier ?? null;
  const groupType = extraction.group_signals !== 'unclear' && extraction.group_signals !== ''
    ? (extraction.group_signals as any)
    : existing?.groupType ?? null;
  const decisionReadiness = extraction.decision_readiness !== 'unclear' && extraction.decision_readiness !== ''
    ? (extraction.decision_readiness as any)
    : existing?.decisionReadiness ?? null;
  const accommodationPref = extraction.accommodation_signals !== 'unclear' && extraction.accommodation_signals !== ''
    ? (extraction.accommodation_signals as any)
    : existing?.accommodationPref ?? null;

  const partialProfile: Partial<TravelerProfile> = {
    travel_archetype: archetype as any,
    budget_tier: budgetTier,
    group_type: groupType,
    decision_readiness: decisionReadiness,
    accommodation_preference: accommodationPref,
    destinations_mentioned: newDests,
    activities_preferred: newActivities,
    food_restrictions: newFood,
    engagement_score: newEngagement,
  };

  const completeness = calculateCompleteness(partialProfile);
  const adSegments = deriveAdSegments({ ...partialProfile, profileCompleteness: completeness });
  const allSegments = [...new Set([...currentSegments, ...adSegments])];

  const upsertData = {
    travelArchetype: archetype,
    budgetTier,
    groupType,
    decisionReadiness,
    accommodationPref,
    destinationsMentioned: newDests,
    activitiesPreferred: newActivities,
    foodRestrictions: newFood,
    engagementScore: newEngagement,
    adSegments: allSegments,
    profileCompleteness: completeness,
  };

  await prisma.travelerProfile.upsert({
    where: { sessionId },
    create: { sessionId, ...upsertData },
    update: upsertData,
  });

  return { ...partialProfile, ad_segments: allSegments, profileCompleteness: completeness };
}

export function determineStage(
  profile: Partial<TravelerProfile>,
  messageCount: number
): ConversationStage {
  const completeness = profile.profileCompleteness ?? 0;
  if (messageCount === 0) return 'intake';
  if (completeness >= 0.7 || messageCount >= 8) return 'proposal';
  if (profile.decision_readiness === 'ready_to_book') return 'booking';
  return 'profiling';
}
