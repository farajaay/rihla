import type {
  PersonalitySignals,
  PersonalityDimensions,
  PersonalityProfile,
  PersonalityDecisionStage,
  UrgePrediction,
  UrgeType,
} from '../types/personality';
import prisma from './db';

// ── Score clamping helper ─────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ── Category derivation from score ───────────────────────────────────────

function categoryFromScore(
  score: number,
  highLabel: string,
  lowLabel: string
): string {
  if (score >= 62) return highLabel;
  if (score <= 38) return lowLabel;
  return 'balanced';
}

// ── Signal → score delta mapping ─────────────────────────────────────────
// Each signal nudges the score by ±DELTA; existing score regresses toward
// 50 by 10% each turn if no signals arrive (slow decay keeps data fresh).

const DELTA = 12; // points per signal occurrence
const DECAY_RATE = 0.08; // pull toward 50 each round without signals
const STARTING_SCORE = 50;

function applySignals(
  existingScore: number | null,
  positiveCount: number, // signals that push toward high end
  negativeCount: number  // signals that push toward low end
): number {
  const base = existingScore ?? STARTING_SCORE;
  const netSignals = positiveCount - negativeCount;
  if (netSignals === 0 && existingScore !== null) {
    // Gentle decay toward centre
    return clamp(base + (STARTING_SCORE - base) * DECAY_RATE);
  }
  return clamp(base + netSignals * DELTA);
}

// ── Main scoring function ─────────────────────────────────────────────────

/**
 * Merges freshly extracted personality signals with existing dimension scores
 * (or defaults) and returns updated PersonalityDimensions.
 */
export function scorePersonality(
  signals: PersonalitySignals,
  existingDimensions: Partial<PersonalityDimensions> | null
): PersonalityDimensions {
  // Novelty: novelty_seeker → high, comfort_seeker → low
  const noveltyHigh = signals.novelty_signals.filter((s) => s === 'novelty_seeker').length;
  const noveltyLow = signals.novelty_signals.filter((s) => s === 'comfort_seeker').length;
  const noveltyDrive = applySignals(existingDimensions?.noveltyDrive ?? null, noveltyHigh, noveltyLow);

  // Social: connector → high, solitary → low
  const socialHigh = signals.social_signals.filter((s) => s === 'connector').length;
  const socialLow = signals.social_signals.filter((s) => s === 'solitary').length;
  const socialDrive = applySignals(existingDimensions?.socialDrive ?? null, socialHigh, socialLow);

  // Status: status_driven → high, experience_driven → low
  const statusHigh = signals.status_signals.filter((s) => s === 'status_driven').length;
  const statusLow = signals.status_signals.filter((s) => s === 'experience_driven').length;
  const statusDrive = applySignals(existingDimensions?.statusDrive ?? null, statusHigh, statusLow);

  // Planning: structured_planner → high, spontaneous → low
  const planHigh = signals.planning_signals.filter((s) => s === 'structured_planner').length;
  const planLow = signals.planning_signals.filter((s) => s === 'spontaneous').length;
  const planningStyle = applySignals(existingDimensions?.planningStyle ?? null, planHigh, planLow);

  // Sensory: hedonist → high, intellectual → low
  const sensHigh = signals.sensory_signals.filter((s) => s === 'hedonist').length;
  const sensLow = signals.sensory_signals.filter((s) => s === 'intellectual').length;
  const sensoryMode = applySignals(existingDimensions?.sensoryMode ?? null, sensHigh, sensLow);

  return { noveltyDrive, socialDrive, statusDrive, planningStyle, sensoryMode };
}

// ── Decision stage coercion ───────────────────────────────────────────────

function coerceDecisionStage(
  signal: PersonalitySignals['decision_stage_signal'],
  existing: PersonalityDecisionStage | null
): PersonalityDecisionStage {
  if (signal !== 'unclear') return signal;
  return existing ?? 'dreaming';
}

// ── Urge prediction ───────────────────────────────────────────────────────

/**
 * Derives the most likely next travel urge from the personality dimensions.
 * Returns a UrgeType, confidence [0–1], and trigger phrases.
 */
export function predictNextUrge(dimensions: PersonalityDimensions): UrgePrediction {
  const { noveltyDrive, socialDrive, statusDrive, planningStyle, sensoryMode } = dimensions;

  // Score each urge type with a weighted formula
  const scores: Record<UrgeType, number> = {
    luxury_escape:
      statusDrive * 0.40 + sensoryMode * 0.30 + (100 - noveltyDrive) * 0.20 + planningStyle * 0.10,

    adventure_fix:
      noveltyDrive * 0.45 + (100 - planningStyle) * 0.25 + (100 - sensoryMode) * 0.20 + (100 - socialDrive) * 0.10,

    cultural_immersion:
      (100 - sensoryMode) * 0.40 + noveltyDrive * 0.30 + (100 - statusDrive) * 0.20 + (100 - socialDrive) * 0.10,

    beach_reset:
      sensoryMode * 0.35 + (100 - noveltyDrive) * 0.30 + (100 - planningStyle) * 0.20 + socialDrive * 0.15,

    family_memory_making:
      socialDrive * 0.45 + (100 - noveltyDrive) * 0.25 + planningStyle * 0.20 + (100 - statusDrive) * 0.10,

    romantic_reconnect:
      (100 - socialDrive) * 0.20 + sensoryMode * 0.35 + (100 - noveltyDrive) * 0.25 + statusDrive * 0.20,

    solo_discovery:
      (100 - socialDrive) * 0.40 + noveltyDrive * 0.35 + (100 - statusDrive) * 0.15 + (100 - planningStyle) * 0.10,

    group_celebration:
      socialDrive * 0.50 + sensoryMode * 0.25 + (100 - planningStyle) * 0.15 + statusDrive * 0.10,

    wellness_retreat:
      sensoryMode * 0.30 + (100 - noveltyDrive) * 0.30 + (100 - socialDrive) * 0.25 + (100 - planningStyle) * 0.15,

    bucket_list_achievement:
      noveltyDrive * 0.30 + planningStyle * 0.30 + statusDrive * 0.25 + (100 - socialDrive) * 0.15,
  };

  const sorted = (Object.entries(scores) as [UrgeType, number][]).sort((a, b) => b[1] - a[1]);
  const [topUrge, topScore] = sorted[0];
  const [, secondScore] = sorted[1];

  // Confidence: how much the top urge dominates over the second
  const maxPossible = 100;
  const gap = topScore - secondScore;
  const rawConfidence = (topScore / maxPossible) * 0.6 + (gap / maxPossible) * 0.4;
  const confidence = clamp(Math.round(rawConfidence * 100) / 100, 0.1, 0.97);

  const predictedTriggers = buildTriggers(topUrge, dimensions);

  return { nextUrge: topUrge, confidence, predictedTriggers };
}

// ── Trigger phrase generation ─────────────────────────────────────────────

function buildTriggers(urge: UrgeType, d: PersonalityDimensions): string[] {
  const map: Record<UrgeType, string[]> = {
    luxury_escape: [
      'Feeling a need to be pampered after a stressful period',
      'Desire to experience something exclusive and Instagram-worthy',
      'Anniversary, promotion, or milestone to celebrate',
    ],
    adventure_fix: [
      'Feeling restless or stuck in a routine',
      'A friend shares an extreme experience on social media',
      'Long weekend or sudden vacation days opening up',
    ],
    cultural_immersion: [
      'Reading a book or watching a documentary about a destination',
      'Craving depth and meaning over entertainment',
      'Interest in learning a new language or craft',
    ],
    beach_reset: [
      'Burnout, work overload, or need to disconnect',
      'Hot weather making a cool ocean irresistible',
      'Seeing beach content online in winter months',
    ],
    family_memory_making: [
      'School holiday window approaching',
      'Children at an age where travel memories form deeply',
      'Extended family reunion or special occasion',
    ],
    romantic_reconnect: [
      'Anniversary, proposal plan, or relationship milestone',
      'Feeling disconnected from partner after busy months',
      'Valentine season, Eid holiday, or honeymoon planning',
    ],
    solo_discovery: [
      'Feeling a need for personal space and reflection',
      'Major life transition (new job, end of relationship)',
      'Inspiring solo travel story or podcast encountered',
    ],
    group_celebration: [
      'Bachelor / bachelorette party planning',
      'Friend group milestone birthday (30, 40)',
      'Post-exam or post-Ramadan collective release',
    ],
    wellness_retreat: [
      'Doctor or therapist suggestion to reduce stress',
      'New year or Ramadan post-fast reset intention',
      'Body soreness, sleep issues, or mental fatigue',
    ],
    bucket_list_achievement: [
      'Approaching a milestone birthday (30, 40, 50)',
      'News story or documentary about a destination on their list',
      'Financial milestone reached that unlocks a dream trip',
    ],
  };

  // Personalise slightly based on strongest dimensions
  const result = map[urge].slice(0, 3);

  if (d.statusDrive > 70 && urge === 'luxury_escape') {
    result.push('Peer travel posts triggering desire to match or exceed status');
  }
  if (d.noveltyDrive > 70 && urge === 'adventure_fix') {
    result.push('Scroll fatigue from seeing the same popular destinations');
  }

  return result;
}

// ── DB upsert ─────────────────────────────────────────────────────────────

/**
 * Scores personality from fresh signals, merges with existing DB data,
 * and upserts the PersonalityProfile row.
 * Returns the updated domain model.
 */
export async function upsertPersonalityProfile(
  sessionId: string,
  signals: PersonalitySignals
): Promise<PersonalityProfile> {
  // Load existing record for merge
  const existing = await prisma.personalityProfile.findUnique({ where: { sessionId } });

  const existingDimensions: Partial<PersonalityDimensions> | null = existing
    ? {
        noveltyDrive: existing.noveltyDrive,
        socialDrive: existing.socialDrive,
        statusDrive: existing.statusDrive,
        planningStyle: existing.planningStyle,
        sensoryMode: existing.sensoryMode,
      }
    : null;

  const dimensions = scorePersonality(signals, existingDimensions);
  const urge = predictNextUrge(dimensions);
  const decisionStage = coerceDecisionStage(
    signals.decision_stage_signal,
    (existing?.decisionStage as PersonalityDecisionStage | null) ?? null
  );

  const noveltyCategory = categoryFromScore(dimensions.noveltyDrive, 'novelty_seeker', 'comfort_seeker');
  const socialCategory = categoryFromScore(dimensions.socialDrive, 'connector', 'solitary');
  const statusCategory = categoryFromScore(dimensions.statusDrive, 'status_driven', 'experience_driven');
  const planningCategory = categoryFromScore(dimensions.planningStyle, 'structured_planner', 'spontaneous');
  const sensoryCategory = categoryFromScore(dimensions.sensoryMode, 'hedonist', 'intellectual');

  const now = new Date();

  const upsertData = {
    noveltyDrive: dimensions.noveltyDrive,
    socialDrive: dimensions.socialDrive,
    statusDrive: dimensions.statusDrive,
    planningStyle: dimensions.planningStyle,
    sensoryMode: dimensions.sensoryMode,
    noveltyCategory,
    socialCategory,
    statusCategory,
    planningCategory,
    sensoryCategory,
    nextUrge: urge.nextUrge,
    urgeConfidence: urge.confidence,
    predictedTriggers: urge.predictedTriggers,
    decisionStage,
    lastAssessedAt: now,
  };

  await prisma.personalityProfile.upsert({
    where: { sessionId },
    create: { sessionId, ...upsertData },
    update: upsertData,
  });

  return {
    session_id: sessionId,
    novelty_drive: dimensions.noveltyDrive,
    social_drive: dimensions.socialDrive,
    status_drive: dimensions.statusDrive,
    planning_style: dimensions.planningStyle,
    sensory_mode: dimensions.sensoryMode,
    novelty_category: noveltyCategory as PersonalityProfile['novelty_category'],
    social_category: socialCategory as PersonalityProfile['social_category'],
    status_category: statusCategory as PersonalityProfile['status_category'],
    planning_category: planningCategory as PersonalityProfile['planning_category'],
    sensory_category: sensoryCategory as PersonalityProfile['sensory_category'],
    next_urge: urge.nextUrge,
    urge_confidence: urge.confidence,
    predicted_triggers: urge.predictedTriggers,
    decision_stage: decisionStage,
    last_assessed_at: now,
  };
}
