// In-memory per-user rate limiting for /api/agent. Not shared across
// serverless instances/cold starts — good enough while the app has a small,
// allowlisted user base; revisit with a persistent store if that changes.

interface UserLimitState {
  minuteWindowStart: number;
  minuteCount: number;
  dayWindowStart: number;
  dayCount: number;
}

const state = new Map<string, UserLimitState>();

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BURST_LIMIT = 5;   // searches per minute
const DAILY_LIMIT = 30;  // searches per day

export function checkSearchRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  let s = state.get(userId);
  if (!s) {
    s = { minuteWindowStart: now, minuteCount: 0, dayWindowStart: now, dayCount: 0 };
    state.set(userId, s);
  }

  if (now - s.minuteWindowStart >= MINUTE_MS) {
    s.minuteWindowStart = now;
    s.minuteCount = 0;
  }
  if (now - s.dayWindowStart >= DAY_MS) {
    s.dayWindowStart = now;
    s.dayCount = 0;
  }

  if (s.minuteCount >= BURST_LIMIT) {
    return { allowed: false, reason: `Too many searches — please wait a moment and try again (limit: ${BURST_LIMIT} per minute).` };
  }
  if (s.dayCount >= DAILY_LIMIT) {
    return { allowed: false, reason: `Daily search limit reached (${DAILY_LIMIT}). Please try again tomorrow.` };
  }

  s.minuteCount++;
  s.dayCount++;
  return { allowed: true };
}
