export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

export interface SearchParams {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  cabin: CabinClass;
  adults: number;
  sources?: string[]; // Seats.aero source keys to query; omit to search all
}

export interface FlightSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration: string;
}

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;  // ISO datetime
  arrival: string;    // ISO datetime
  duration: string;   // e.g. "PT8H30M"
  cabin: CabinClass;
  stops: number;
  segments: FlightSegment[];
  price: number;      // cash price in `currency`, or mileage cost when source is set
  currency: string;
  // Award-specific fields (populated by Seats.aero adapter)
  mileageCost?: number;     // award cost in miles
  source?: string;          // mileage program (e.g. "aeroplan", "united")
  available?: boolean;      // whether award space is confirmed open
  remainingSeats?: number;
  rawData: unknown;
}

export interface FlightAdapter {
  searchFlights(params: SearchParams): Promise<FlightOffer[]>;
  confirmPrice(offer: FlightOffer): Promise<FlightOffer>;
}
