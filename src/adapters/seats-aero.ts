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
  YAvailable: boolean;
  WAvailable: boolean;
  JAvailable: boolean;
  FAvailable: boolean;
  YMileageCost: string;
  WMileageCost: string;
  JMileageCost: string;
  FMileageCost: string;
  YRemainingSeats: number;
  WRemainingSeats: number;
  JRemainingSeats: number;
  FRemainingSeats: number;
  Source: string;
  Airlines: string;
  FlightNumbers: string;
  Stops: number;
}

function getCabinFields(raw: SeatsAeroAvailability, cabin: CabinClass) {
  const k = CABIN_KEY[cabin];
  return {
    available: raw[`${k}Available` as keyof SeatsAeroAvailability] as boolean,
    mileageCost: parseInt((raw[`${k}MileageCost` as keyof SeatsAeroAvailability] as string) ?? '0', 10) || 0,
    remainingSeats: (raw[`${k}RemainingSeats` as keyof SeatsAeroAvailability] as number) ?? 0,
  };
}

function mapAvailability(raw: SeatsAeroAvailability, cabin: CabinClass): FlightOffer {
  const { available, mileageCost, remainingSeats } = getCabinFields(raw, cabin);
  const dateStr = raw.ParsedDate ?? raw.Date?.split('T')[0] ?? '';
  const origin = raw.Route?.OriginAirport ?? '';
  const destination = raw.Route?.DestinationAirport ?? '';

  const segment: FlightSegment = {
    departure: { iataCode: origin, at: `${dateStr}T00:00:00` },
    arrival: { iataCode: destination, at: `${dateStr}T00:00:00` },
    carrierCode: raw.Airlines ?? '',
    number: raw.FlightNumbers ?? '',
    duration: '',
  };

  return {
    id: raw.ID,
    airline: raw.Airlines ?? '',
    flightNumber: raw.FlightNumbers ?? '',
    departure: `${dateStr}T00:00:00`,
    arrival: `${dateStr}T00:00:00`,
    duration: '',
    cabin,
    stops: raw.Stops ?? 0,
    segments: [segment],
    price: mileageCost,
    currency: raw.Source ?? 'unknown',
    mileageCost,
    source: raw.Source,
    available,
    remainingSeats,
    rawData: raw,
  };
}

export class SeatsAeroAdapter implements FlightAdapter {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.SEATS_AERO_API_KEY;
    if (!key) throw new Error('SEATS_AERO_API_KEY must be set');
    this.apiKey = key;
  }

  async searchFlights(params: SearchParams): Promise<FlightOffer[]> {
    const query = new URLSearchParams({
      origin_airport: params.origin.toUpperCase(),
      destination_airport: params.destination.toUpperCase(),
      cabin: CABIN_PARAM[params.cabin],
      start_date: params.date,
      end_date: params.date,
      take: '50',
    });

    const res = await fetch(`${BASE_URL}/availability?${query}`, {
      headers: {
        'Partner-Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Seats.aero search failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const data: SeatsAeroAvailability[] = json.data ?? [];

    // Only return entries where the requested cabin has availability
    return data
      .filter((r) => getCabinFields(r, params.cabin).available)
      .map((r) => mapAvailability(r, params.cabin));
  }

  async confirmPrice(offer: FlightOffer): Promise<FlightOffer> {
    // Award prices in Seats.aero are fixed — no confirmation step needed
    return offer;
  }
}

export const seatsAeroAdapter = new SeatsAeroAdapter();
