import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 3,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<15000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // 1. Create session
  const s = http.post(
    `${BASE_URL}/api/sessions`,
    JSON.stringify({ consentGiven: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const sessionId = s.json() && s.json().sessionId;
  if (!sessionId) return;

  // 2. Send a few chat messages to populate the profile
  const messages = [
    'I want a 5-day luxury trip to Maldives in October',
    'My budget is around 30000 SAR, just me and my wife',
    'We love private pool villas and water sports',
  ];
  for (const message of messages) {
    http.post(
      `${BASE_URL}/api/chat/stream`,
      JSON.stringify({ sessionId, message }),
      { headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId }, timeout: '30s' }
    );
  }

  // 3. Generate itinerary
  const res = http.post(
    `${BASE_URL}/api/itineraries/generate`,
    JSON.stringify({ sessionId }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '60s' }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has id': (r) => r.json() && !!r.json().id,
    'has itinerary': (r) => r.json() && !!r.json().itinerary,
  });

  sleep(5);
}
