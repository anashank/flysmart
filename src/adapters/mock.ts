import type { FlightAdapter, FlightOffer, SearchParams, CabinClass } from './types';

// Realistic mock award availability data for local development.
// Covers common programs and routes so the full agent loop can run without a live API key.

const MOCK_PROGRAMS = [
  { source: 'aeroplan',   airline: 'AC',  flightNumber: 'AC856',  stops: 0 },
  { source: 'united',     airline: 'UA',  flightNumber: 'UA920',  stops: 0 },
  { source: 'flyingblue', airline: 'AF',  flightNumber: 'AF006',  stops: 0 },
  { source: 'british',    airline: 'BA',  flightNumber: 'BA178',  stops: 0 },
  { source: 'virgin',     airline: 'VS',  flightNumber: 'VS003',  stops: 0 },
  { source: 'turkish',    airline: 'TK',  flightNumber: 'TK001',  stops: 1 },
  { source: 'singapore',  airline: 'SQ',  flightNumber: 'SQ036',  stops: 0 },
];

// Mileage costs by cabin and program (roughly realistic)
const MILEAGE_COSTS: Record<string, Partial<Record<CabinClass, number>>> = {
  aeroplan:   { ECONOMY: 35000, BUSINESS: 65000, FIRST: 90000, PREMIUM_ECONOMY: 45000 },
  united:     { ECONOMY: 30000, BUSINESS: 70000, FIRST: 110000, PREMIUM_ECONOMY: 45000 },
  flyingblue: { ECONOMY: 28000, BUSINESS: 50000, FIRST: 85000, PREMIUM_ECONOMY: 40000 },
  british:    { ECONOMY: 26000, BUSINESS: 55000, FIRST: 85000, PREMIUM_ECONOMY: 38000 },
  virgin:     { ECONOMY: 25000, BUSINESS: 60000, FIRST: 95000, PREMIUM_ECONOMY: 42000 },
  turkish:    { ECONOMY: 22000, BUSINESS: 45000, FIRST: 80000,  PREMIUM_ECONOMY: 35000 },
  singapore:  { ECONOMY: 17500, BUSINESS: 42000, FIRST: 86000,  PREMIUM_ECONOMY: 30000 },
};

function makeMockOffer(
  params: SearchParams,
  program: typeof MOCK_PROGRAMS[number],
  index: number
): FlightOffer {
  const cost = MILEAGE_COSTS[program.source]?.[params.cabin] ?? 50000;
  const seats = Math.floor(Math.random() * 4) + 1;

  return {
    id: `mock-${program.source}-${index}`,
    airline: program.airline,
    flightNumber: program.flightNumber,
    departure: `${params.date}T09:${String(index * 10).padStart(2, '0')}:00`,
    arrival: `${params.date}T21:${String(index * 5).padStart(2, '0')}:00`,
    duration: '',
    cabin: params.cabin,
    stops: program.stops,
    segments: [
      {
        departure: { iataCode: params.origin.toUpperCase(), at: `${params.date}T09:00:00` },
        arrival: { iataCode: params.destination.toUpperCase(), at: `${params.date}T21:00:00` },
        carrierCode: program.airline,
        number: program.flightNumber,
        duration: '',
      },
    ],
    price: cost,
    currency: program.source,
    mileageCost: cost,
    source: program.source,
    available: true,
    remainingSeats: seats,
    rawData: null,
  };
}

export class MockAdapter implements FlightAdapter {
  async searchFlights(params: SearchParams): Promise<FlightOffer[]> {
    // Simulate a short network delay
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_PROGRAMS.map((p, i) => makeMockOffer(params, p, i));
  }

  async confirmPrice(offer: FlightOffer): Promise<FlightOffer> {
    return offer;
  }
}

export const mockAdapter = new MockAdapter();
