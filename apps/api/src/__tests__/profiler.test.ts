import { describe, it, expect } from 'vitest';
import { determineStage } from '../services/profiler';
import type { TravelerProfile } from '../types/profile';

const emptyProfile: Partial<TravelerProfile> = { profileCompleteness: 0 };

const richProfile: Partial<TravelerProfile> = {
  profileCompleteness: 0.75,
  travel_archetype: 'explorer',
  group_type: 'couple',
  budget_tier: 'premium',
  destinations_mentioned: ['Tokyo'],
  decision_readiness: 'planning',
};

const readyProfile: Partial<TravelerProfile> = {
  profileCompleteness: 0.5,
  decision_readiness: 'ready_to_book',
};

describe('determineStage', () => {
  it('returns intake when messageCount is 0', () => {
    expect(determineStage(emptyProfile, 0)).toBe('intake');
  });

  it('returns profiling when profile is sparse', () => {
    expect(determineStage(emptyProfile, 2)).toBe('profiling');
  });

  it('returns booking when decision_readiness is ready_to_book (before proposal check)', () => {
    expect(determineStage(readyProfile, 3)).toBe('booking');
  });

  it('returns proposal when completeness >= 0.7', () => {
    expect(determineStage(richProfile, 5)).toBe('proposal');
  });

  it('returns proposal when messageCount >= 10 regardless of completeness', () => {
    expect(determineStage(emptyProfile, 10)).toBe('proposal');
  });
});
