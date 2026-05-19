import type { FlightAdapter, FlightOffer, FlightSegment, SearchParams, CabinClass } from './types';

const BASE_URL = 'https://seats.aero/partnerapi';

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

// Default sources when no wallet is provided — most popular programs only (reduces API calls)
const ALL_SOURCES = [
  'aeroplan', 'united', 'flyingblue', 'british', 'virginatlantic',
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

    return results
      .filter((r): r is PromiseFulfilledResult<FlightOffer[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }

  async confirmPrice(offer: FlightOffer): Promise<FlightOffer> {
    // Award prices in Seats.aero are fixed — no confirmation step needed
    return offer;
  }
}

export const seatsAeroAdapter = new SeatsAeroAdapter();
