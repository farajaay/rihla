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
export type ComfortThreshold = 'budget' | 'mid' | 'luxury' | 'ultra';
export type GroupType = 'solo' | 'couple' | 'family' | 'friends';
export type ConversationStage = 'intake' | 'profiling' | 'proposal' | 'booking';

export interface TravelerProfile {
  session_id: string;
  created_at: Date;
  travel_archetype: TravelArchetype | null;
  decision_driver: DecisionDriver | null;
  tolerance_profile: {
    spontaneity_score: number;
    comfort_threshold: ComfortThreshold;
    risk_appetite: 'low' | 'medium' | 'high';
  };
  group_type: GroupType | null;
  group_size: number | null;
  is_decision_maker: boolean | null;
  budget_tier: BudgetTier | null;
  budget_ceiling_sar: number | null;
  value_definition: string | null;
  destinations_mentioned: string[];
  activities_preferred: string[];
  accommodation_preference: 'hotel' | 'apartment' | 'resort' | 'boutique' | null;
  food_restrictions: string[];
  ad_segments: string[];
  engagement_score: number;
  decision_readiness: 'browsing' | 'planning' | 'ready_to_book' | null;
  profileCompleteness: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: Date;
}
