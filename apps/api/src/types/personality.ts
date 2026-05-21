// ── Personality dimension scores (0–100) ─────────────────────────────────
// High end = first label, low end = second label

export interface PersonalityDimensions {
  /** 0 = comfort_seeker, 100 = novelty_seeker */
  noveltyDrive: number;
  /** 0 = solitary, 100 = connector */
  socialDrive: number;
  /** 0 = experience_driven, 100 = status_driven */
  statusDrive: number;
  /** 0 = spontaneous, 100 = structured_planner */
  planningStyle: number;
  /** 0 = intellectual, 100 = hedonist */
  sensoryMode: number;
}

// ── Dimension signal labels ───────────────────────────────────────────────

export type NoveltySignal = 'novelty_seeker' | 'comfort_seeker' | 'neutral';
export type SocialSignal = 'connector' | 'solitary' | 'neutral';
export type StatusSignal = 'status_driven' | 'experience_driven' | 'neutral';
export type PlanningSignal = 'structured_planner' | 'spontaneous' | 'neutral';
export type SensorySignal = 'hedonist' | 'intellectual' | 'neutral';

// ── Urge types ────────────────────────────────────────────────────────────

export type UrgeType =
  | 'luxury_escape'
  | 'adventure_fix'
  | 'cultural_immersion'
  | 'beach_reset'
  | 'family_memory_making'
  | 'romantic_reconnect'
  | 'solo_discovery'
  | 'group_celebration'
  | 'wellness_retreat'
  | 'bucket_list_achievement';

// ── Decision stage (personality readiness, distinct from ConversationStage) ─

export type PersonalityDecisionStage =
  | 'dreaming'
  | 'researching'
  | 'comparing'
  | 'committed';

// ── Personality signal extraction (from Claude) ───────────────────────────

export interface PersonalitySignals {
  /** Raw directional hints for each dimension — list of signal labels */
  novelty_signals: NoveltySignal[];
  social_signals: SocialSignal[];
  status_signals: StatusSignal[];
  planning_signals: PlanningSignal[];
  sensory_signals: SensorySignal[];
  /** Decision stage hint extracted from this message */
  decision_stage_signal: PersonalityDecisionStage | 'unclear';
}

// ── Urge prediction result ────────────────────────────────────────────────

export interface UrgePrediction {
  nextUrge: UrgeType;
  /** 0–1 confidence */
  confidence: number;
  /** Human-readable trigger phrases that would activate this urge */
  predictedTriggers: string[];
}

// ── Full personality profile (domain model, snake_case for API layer) ─────

export interface PersonalityProfile {
  session_id: string;

  // Dimension scores
  novelty_drive: number;
  social_drive: number;
  status_drive: number;
  planning_style: number;
  sensory_mode: number;

  // Derived category labels
  novelty_category: 'novelty_seeker' | 'comfort_seeker' | 'balanced';
  social_category: 'connector' | 'solitary' | 'balanced';
  status_category: 'status_driven' | 'experience_driven' | 'balanced';
  planning_category: 'structured_planner' | 'spontaneous' | 'balanced';
  sensory_category: 'hedonist' | 'intellectual' | 'balanced';

  // Urge prediction
  next_urge: UrgeType | null;
  urge_confidence: number;
  predicted_triggers: string[];

  // Decision readiness
  decision_stage: PersonalityDecisionStage;

  // Meta
  last_assessed_at: Date;
}

// ── Prisma upsert shape (camelCase) ─────────────────────────────────────
// Used when writing to prisma.personalityProfile

export interface PersonalityProfileUpsert {
  noveltyDrive: number;
  socialDrive: number;
  statusDrive: number;
  planningStyle: number;
  sensoryMode: number;
  noveltyCategory: string;
  socialCategory: string;
  statusCategory: string;
  planningCategory: string;
  sensoryCategory: string;
  nextUrge: string | null;
  urgeConfidence: number;
  predictedTriggers: string[];
  decisionStage: string;
  lastAssessedAt: Date;
}
