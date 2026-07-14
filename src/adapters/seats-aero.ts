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

async function fetchTripDetails(id: string, apiKey: string): Promise<Trip[]> {
  const res = await fetch(`${BASE_URL}/trips/${id}`, {
    headers: { 'Partner-Authorization': apiKey },
  });
  captureRateLimit(res);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as Trip[];
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

// Default sources when no wallet is provided — every program the app knows how to book
const ALL_SOURCES = [
  'aeroplan', 'united', 'delta', 'american', 'southwest',
  'british', 'flyingblue', 'singapore', 'virginatlantic',
  'emirates', 'turkish', 'ana', 'avianca',
];

export class SeatsAeroAdapter implements FlightAdapter {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.SEATS_AERO_API_KEY;
    if (!key) throw new Error('SEATS_AERO_API_KEY must be set');
    this.apiKey = key;
  }

  private async searchSource(params: SearchParams, source: string): Promise<FlightOffer[]> {
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

    return data
      .filter((r) => getCabinFields(r, params.cabin).available)
      .map((r) => mapAvailability(r, params.cabin));
  }

  async searchFlights(params: SearchParams): Promise<FlightOffer[]> {
    const sources = params.sources?.length ? params.sources : ALL_SOURCES;
    const results = await Promise.allSettled(
      sources.map((source) => this.searchSource(params, source))
    );

    const rateLimited = results.filter(
      (r) => r.status === 'rejected' && (r.reason as Error)?.message === 'RATE_LIMITED'
    );

    if (rateLimited.length === results.length) {
      throw new Error('Seats.aero rate limit reached. Please wait a few minutes and try again.');
    }

    const all = results
      .filter((r): r is PromiseFulfilledResult<FlightOffer[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    // Deduplicate: same airline + source program → keep cheapest
    const seen = new Map<string, FlightOffer>();
    for (const flight of all) {
      const key = `${flight.airline}|${flight.source}|${flight.cabin}`;
      const existing = seen.get(key);
      if (!existing || flight.mileageCost! < existing.mileageCost!) {
        seen.set(key, flight);
      }
    }
    const deduped = Array.from(seen.values());

    // Enrich the (small, deduped) final result set with real flight-level detail
    return Promise.all(
      deduped.map((offer) => enrichWithTripDetails(offer, this.apiKey, CABIN_PARAM[params.cabin]))
    );
  }

  async confirmPrice(offer: FlightOffer): Promise<FlightOffer> {
    // Award prices in Seats.aero are fixed — no confirmation step needed
    return offer;
  }
}

export const seatsAeroAdapter = new SeatsAeroAdapter();
