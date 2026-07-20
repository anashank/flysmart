import type { FlightAdapter, FlightOffer, FlightSegment, SearchParams, CabinClass } from './types';

const BASE_URL = 'https://seats.aero/partnerapi';

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetSeconds: number;
}

let lastRateLimit: RateLimitStatus | null = null;

function captureRateLimit(res: Response): void {
  const limit = res.headers.get('x-ratelimit-limit');
  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (limit && remaining) {
    lastRateLimit = { limit: +limit, remaining: +remaining, resetSeconds: reset ? +reset : 0 };
  }
}

// Best-effort snapshot of the most recent Seats.aero rate-limit headers seen —
// useful for surfacing "calls remaining today" in the UI while testing.
export function getSeatsAeroRateLimit(): RateLimitStatus | null {
  return lastRateLimit;
}

// Guard for expensive exploratory scans (nearby dates/airports can fan out to
// dozens of calls) — once quota is this low, skip further exploration rather
// than risk exhausting the daily limit on one search.
export function isRateLimitLow(threshold = 50): boolean {
  return lastRateLimit !== null && lastRateLimit.remaining < threshold;
}

// Seats.aero cabin codes
const CABIN_KEY: Record<CabinClass, string> = {
  ECONOMY: 'Y',
  PREMIUM_ECONOMY: 'W',
  BUSINESS: 'J',
  FIRST: 'F',
};

const CABIN_PARAM: Record<CabinClass, string> = {
  ECONOMY: 'economy',
  PREMIUM_ECONOMY: 'premium',
  BUSINESS: 'business',
  FIRST: 'first',
};

interface TripSegment {
  FlightNumber: string;
  AircraftName: string;
  OriginAirport: string;
  DestinationAirport: string;
  DepartsAt: string;
  ArrivesAt: string;
}

interface Trip {
  AvailabilitySegments: TripSegment[];
  Stops: number;
  Connections: string[] | null;
  Aircraft: string[] | null;
  FlightNumbers: string;
  Cabin: string;
  MileageCost: number;
}

interface SeatsAeroAvailability {
  ID: string;
  Route: { OriginAirport: string; DestinationAirport: string };
  Date: string;
  ParsedDate?: string;
  YAvailable: boolean; WAvailable: boolean; JAvailable: boolean; FAvailable: boolean;
  YMileageCost: string; WMileageCost: string; JMileageCost: string; FMileageCost: string;
  YRemainingSeats: number; WRemainingSeats: number; JRemainingSeats: number; FRemainingSeats: number;
  YAirlines: string; WAirlines: string; JAirlines: string; FAirlines: string;
  YTotalTaxes: number; WTotalTaxes: number; JTotalTaxes: number; FTotalTaxes: number;
  Source: string;
  [key: string]: unknown;
}

function getCabinFields(raw: SeatsAeroAvailability, cabin: CabinClass) {
  const k = CABIN_KEY[cabin];
  return {
    available:      raw[`${k}Available`]      as boolean,
    mileageCost:    parseInt((raw[`${k}MileageCost`] as string) ?? '0', 10) || 0,
    remainingSeats: (raw[`${k}RemainingSeats`] as number) ?? 0,
    airlines:       ((raw[`${k}Airlines`] as string) ?? '').split(',').map(s => s.trim()).filter(Boolean),
    taxes:          (raw[`${k}TotalTaxes`] as number) ?? 0,
  };
}

function mapAvailability(raw: SeatsAeroAvailability, cabin: CabinClass): FlightOffer {
  const { available, mileageCost, remainingSeats, airlines, taxes } = getCabinFields(raw, cabin);
  const dateStr = raw.ParsedDate?.split('T')[0] ?? raw.Date?.split('T')[0] ?? '';
  const origin = raw.Route?.OriginAirport ?? '';
  const destination = raw.Route?.DestinationAirport ?? '';
  const primaryAirline = airlines[0] ?? '';

  const segment: FlightSegment = {
    departure: { iataCode: origin, at: dateStr ? `${dateStr}T00:00:00` : '' },
    arrival:   { iataCode: destination, at: dateStr ? `${dateStr}T00:00:00` : '' },
    carrierCode: primaryAirline,
    number: '',
    duration: '',
  };

  return {
    id: raw.ID,
    airline: airlines.join(', '),
    flightNumber: '',
    departure: dateStr ? `${dateStr}T00:00:00` : '',
    arrival:   dateStr ? `${dateStr}T00:00:00` : '',
    duration: '',
    cabin,
    stops: airlines.length > 1 ? airlines.length - 1 : 0,
    segments: [segment],
    price: mileageCost,
    currency: raw.Source ?? 'unknown',
    mileageCost,
    taxes,
    source: raw.Source,
    available,
    remainingSeats,
    rawData: raw,
  };
}

function carrierFromFlightNumber(flightNumber: string): string {
  return flightNumber.match(/^[A-Z0-9]{2}/)?.[0] ?? '';
}

// In-memory, best-effort caches — survive repeat calls within a warm serverless
// instance (or a whole `next dev` session), cutting quota use on identical
// re-searches without needing a persistent store. Not shared across instances.
interface CacheEntry<T> { data: T; expiresAt: number }
const availabilityCache = new Map<string, CacheEntry<FlightOffer[]>>();
const tripsCache = new Map<string, CacheEntry<Trip[]>>();
const AVAILABILITY_TTL_MS = 20 * 60 * 1000; // award space shifts slowly; 20 min is safe
const TRIPS_TTL_MS = 60 * 60 * 1000; // flight number/aircraft/routing barely change

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchTripDetails(id: string, apiKey: string): Promise<Trip[]> {
  const cached = getCached(tripsCache, id);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}/trips/${id}`, {
    headers: { 'Partner-Authorization': apiKey },
  });
  captureRateLimit(res);
  if (!res.ok) return [];
  const json = await res.json();
  const trips = (json.data ?? []) as Trip[];
  setCached(tripsCache, id, trips, TRIPS_TTL_MS);
  return trips;
}

// Fetch real flight-level detail (flight numbers, connections, aircraft) for an
// offer via /trips — the /availability endpoint only gives aggregate mileage data.
async function enrichWithTripDetails(offer: FlightOffer, apiKey: string, cabinParam: string): Promise<FlightOffer> {
  try {
    const trips = await fetchTripDetails(offer.id, apiKey);
    const trip = trips.find((t) => t.Cabin === cabinParam && t.MileageCost === offer.mileageCost) ?? trips.find((t) => t.Cabin === cabinParam);
    if (!trip) return offer;

    const segments: FlightSegment[] = trip.AvailabilitySegments.map((s) => ({
      departure: { iataCode: s.OriginAirport, at: s.DepartsAt },
      arrival: { iataCode: s.DestinationAirport, at: s.ArrivesAt },
      carrierCode: carrierFromFlightNumber(s.FlightNumber),
      number: s.FlightNumber,
      duration: '',
    }));

    return {
      ...offer,
      flightNumber: trip.FlightNumbers,
      stops: trip.Stops,
      segments: segments.length > 0 ? segments : offer.segments,
      connections: trip.Connections ?? [],
      aircraft: trip.Aircraft ?? [],
    };
  } catch {
    return offer; // enrichment is best-effort — never let it break the base search result
  }
}

// Every program the app knows how to book
const ALL_SOURCES = [
  'aeroplan', 'united', 'delta', 'american', 'southwest',
  'british', 'flyingblue', 'singapore', 'virginatlantic',
  'emirates', 'turkish', 'ana', 'avianca',
];

// Tried first when no wallet is provided — the 5 highest-coverage programs.
// Only the remaining 8 get queried if these come back empty, so a typical
// blank search costs 5 calls instead of 13.
export const CORE_SOURCES = ['aeroplan', 'united', 'flyingblue', 'british', 'virginatlantic'];
const REMAINING_SOURCES = ALL_SOURCES.filter((s) => !CORE_SOURCES.includes(s));

export class SeatsAeroAdapter implements FlightAdapter {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.SEATS_AERO_API_KEY;
    if (!key) throw new Error('SEATS_AERO_API_KEY must be set');
    this.apiKey = key;
  }

  private async searchSource(params: SearchParams, source: string): Promise<FlightOffer[]> {
    const cacheKey = `${params.origin.toUpperCase()}-${params.destination.toUpperCase()}-${params.date}-${params.cabin}-${source}`;
    const cached = getCached(availabilityCache, cacheKey);
    if (cached) return cached;

    const query = new URLSearchParams({
      origin_airport: params.origin.toUpperCase(),
      destination_airport: params.destination.toUpperCase(),
      cabin: CABIN_PARAM[params.cabin],
      start_date: params.date,
      end_date: params.date,
      source,
      take: '10',
    });

    const res = await fetch(`${BASE_URL}/availability?${query}`, {
      headers: { 'Partner-Authorization': this.apiKey },
    });
    captureRateLimit(res);

    if (res.status === 429) throw new Error('RATE_LIMITED');
    if (!res.ok) return [];

    const json = await res.json();
    const data: SeatsAeroAvailability[] = json.data ?? [];

    const offers = data
      // JAvailable/etc can be true with 0 remaining seats — a stale/cached record
      // that isn't actually bookable, so exclude it rather than surface a dead end.
      .filter((r) => {
        const fields = getCabinFields(r, params.cabin);
        return fields.available && fields.remainingSeats > 0;
      })
      .map((r) => mapAvailability(r, params.cabin));

    setCached(availabilityCache, cacheKey, offers, AVAILABILITY_TTL_MS);
    return offers;
  }

  private async searchSources(params: SearchParams, sources: string[]): Promise<FlightOffer[]> {
    const results = await Promise.allSettled(
      sources.map((source) => this.searchSource(params, source))
    );

    const rateLimited = results.filter(
      (r) => r.status === 'rejected' && (r.reason as Error)?.message === 'RATE_LIMITED'
    );
    if (rateLimited.length === results.length && results.length > 0) {
      throw new Error('Seats.aero rate limit reached. Please wait a few minutes and try again.');
    }

    return results
      .filter((r): r is PromiseFulfilledResult<FlightOffer[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }

  async searchFlights(params: SearchParams): Promise<FlightOffer[]> {
    let all: FlightOffer[];
    if (params.sources?.length) {
      // Caller (e.g. a wallet-scoped search) already knows exactly which
      // programs matter — respect that list as-is.
      all = await this.searchSources(params, params.sources);
    } else {
      // No wallet given: try the 5 highest-coverage programs first, and only
      // pay for the remaining 8 if that comes back empty.
      all = await this.searchSources(params, CORE_SOURCES);
      if (all.length === 0) {
        all = await this.searchSources(params, REMAINING_SOURCES);
      }
    }

    // Deduplicate: same airline + source program → keep cheapest
    const seen = new Map<string, FlightOffer>();
    for (const flight of all) {
      const key = `${flight.airline}|${flight.source}|${flight.cabin}`;
      const existing = seen.get(key);
      if (!existing || flight.mileageCost! < existing.mileageCost!) {
        seen.set(key, flight);
      }
    }
    const deduped = Array.from(seen.values()).sort((a, b) => (a.mileageCost ?? 0) - (b.mileageCost ?? 0));

    // Enrich with real flight-level detail (extra API call per offer) — only for
    // the offers cheap enough to plausibly be shown/recommended, since the UI
    // never surfaces more than ~12 results anyway.
    const ENRICH_LIMIT = 12;
    const enriched = await Promise.all(
      deduped.slice(0, ENRICH_LIMIT).map((offer) => enrichWithTripDetails(offer, this.apiKey, CABIN_PARAM[params.cabin]))
    );
    return [...enriched, ...deduped.slice(ENRICH_LIMIT)];
  }

  async confirmPrice(offer: FlightOffer): Promise<FlightOffer> {
    // Award prices in Seats.aero are fixed — no confirmation step needed
    return offer;
  }
}

export const seatsAeroAdapter = new SeatsAeroAdapter();
