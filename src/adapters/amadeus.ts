import type { FlightAdapter, FlightOffer, FlightSegment, SearchParams, CabinClass } from './types';

const BASE_URL = 'https://test.api.amadeus.com';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.token;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must be set');
  }

  const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };

  return tokenCache.token;
}

function parseDuration(iso: string): string {
  return iso.replace('PT', '').toLowerCase().replace('h', 'h ').replace('m', 'm').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(raw: any, cabin: CabinClass): FlightOffer {
  const itinerary = raw.itineraries[0];
  const segments: FlightSegment[] = itinerary.segments.map((s: any) => ({
    departure: { iataCode: s.departure.iataCode, at: s.departure.at },
    arrival: { iataCode: s.arrival.iataCode, at: s.arrival.at },
    carrierCode: s.carrierCode,
    number: s.number,
    duration: parseDuration(s.duration),
  }));

  const firstSeg = itinerary.segments[0];
  const lastSeg = itinerary.segments[itinerary.segments.length - 1];

  return {
    id: raw.id,
    airline: firstSeg.carrierCode,
    flightNumber: `${firstSeg.carrierCode}${firstSeg.number}`,
    departure: firstSeg.departure.at,
    arrival: lastSeg.arrival.at,
    duration: parseDuration(itinerary.duration),
    cabin,
    stops: itinerary.segments.length - 1,
    segments,
    price: parseFloat(raw.price.grandTotal),
    currency: raw.price.currency,
    rawData: raw,
  };
}

export class AmadeusAdapter implements FlightAdapter {
  async searchFlights(params: SearchParams): Promise<FlightOffer[]> {
    const token = await getAccessToken();

    const body = {
      originLocationCode: params.origin.toUpperCase(),
      destinationLocationCode: params.destination.toUpperCase(),
      departureDate: params.date,
      adults: params.adults,
      travelClass: params.cabin,
      max: 10,
      currencyCode: 'USD',
    };

    const res = await fetch(`${BASE_URL}/v2/shopping/flight-offers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: body }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amadeus flight search failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const offers = (json.data ?? []) as unknown[];
    return offers.map((o) => mapOffer(o, params.cabin));
  }

  async confirmPrice(offer: FlightOffer): Promise<FlightOffer> {
    const token = await getAccessToken();

    const res = await fetch(`${BASE_URL}/v1/shopping/flight-offers/pricing`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { type: 'flight-offers-pricing', flightOffers: [offer.rawData] } }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amadeus price confirm failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const raw = json.data?.flightOffers?.[0] ?? offer.rawData;
    return mapOffer(raw, offer.cabin);
  }
}

export const amadeusAdapter = new AmadeusAdapter();
