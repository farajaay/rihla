import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

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

export interface ItineraryMeta {
  id: string;
  revision: number;
  parentId: string | null;
  refinementRequest: string | null;
}

export function useItinerary(id: string) {
  const [data, setData] = useState<ItineraryData | null>(null);
  const [meta, setMeta] = useState<ItineraryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/itineraries/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((result) => {
        setData(result.itineraryJson as ItineraryData);
        setMeta({
          id: result.id,
          revision: result.revision ?? 1,
          parentId: result.parentId ?? null,
          refinementRequest: result.refinementRequest ?? null,
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load your itinerary. Please go back and try again.');
        setLoading(false);
      });
  }, [id]);

  return { data, meta, loading, error };
}
