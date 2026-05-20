import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<15000'],
  },
};

const MESSAGES = [
  'I want a romantic trip to Italy for our anniversary',
  'Looking for a family beach holiday with kids 6 and 9',
  'Need a luxury Maldives escape for 5 nights',
  'Adventure trip in Switzerland — hiking and trains',
];

export default function () {
  const sessionRes = http.post(
    `${BASE_URL}/api/sessions`,
    JSON.stringify({ consentGiven: true, deviceType: 'desktop' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const sessionId = sessionRes.json() && sessionRes.json().sessionId;
  if (!sessionId) return;

  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const res = http.post(
    `${BASE_URL}/api/chat/stream`,
    JSON.stringify({ sessionId, message }),
    {
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
      timeout: '30s',
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body non-empty': (r) => r.body && r.body.length > 0,
  });

  sleep(2);
}
