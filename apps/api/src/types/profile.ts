export type TravelArchetype =
  | 'explorer'
  | 'luxury_seeker'
  | 'culture_vulture'
  | 'beach_hedonist'
  | 'adventurer'
  | 'family_protector'
  | 'romance_seeker';

export type DecisionDriver =
  | 'price_sensitive'
  | 'experience_driven'
  | 'status_motivated'
  | 'safety_first';

export type BudgetTier = 'lean' | 'balanced' | 'premium' | 'ultra';
export type GroupType = 'solo' | 'couple' | 'family' | 'friends';
export type ConversationStage = 'intake' | 'profiling' | 'proposal' | 'booking';
export type DecisionReadiness = 'browsing' | 'planning' | 'ready_to_book';

export interface TravelerProfile {
  session_id: string;
  created_at: Date;

  // Psychographic
  travel_archetype: TravelArchetype | null;
  decision_driver: DecisionDriver | null;

  // Group
  group_type: GroupType | null;
  group_size: number | null;
  is_decision_maker: boolean | null;

  // Financial
  budget_tier: BudgetTier | null;
  budget_ceiling_sar: number | null;
  value_definition: string | null;

  // Preferences
  destinations_mentioned: string[];
  activities_preferred: string[];
  accommodation_preference: 'hotel' | 'apartment' | 'resort' | 'boutique' | null;
  food_restrictions: string[];

  // Behavioral signals
  emotional_markers: string[];
  date_signals: string[];
  decision_readiness: DecisionReadiness | null;
  engagement_score: number;

  // Ad targeting
  ad_segments: string[];

  // Meta
  profileCompleteness: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: Date;
}
