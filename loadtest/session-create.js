import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/sessions`,
    JSON.stringify({
      deviceType: 'desktop',
      browserLanguage: 'en',
      timezone: 'Asia/Riyadh',
      referralSource: 'k6',
      consentGiven: true,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has sessionId': (r) => !!(r.json() && r.json().sessionId),
  });

  sleep(1);
}
