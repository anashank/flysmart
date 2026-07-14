import type { Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { seatsAeroAdapter } from '@/adapters/seats-aero';
import { PROGRAMS, type PointsCurrency } from '@/data/programs';
import type { FlightOffer, FlightAdapter, CabinClass } from '@/adapters/types';

// ── Points currency → Seats.aero source keys ────────────────────────────────
const CURRENCY_TO_SOURCES: Record<PointsCurrency, string[]> = {
  // Bank cards transfer to these airline programs
  chase_ur:        ['aeroplan', 'united', 'southwest', 'british', 'flyingblue', 'singapore', 'virginatlantic'],
  amex_mr:         ['delta', 'aeroplan', 'british', 'flyingblue', 'singapore', 'ana', 'avianca', 'emirates'],
  citi_typ:        ['flyingblue', 'singapore', 'turkish', 'avianca', 'virginatlantic'],
  capital_one:     ['aeroplan', 'flyingblue', 'singapore', 'turkish', 'avianca', 'emirates', 'ana'],
  // Airline programs book on their own source
  united:          ['united'],
  delta:           ['delta'],
  american:        ['american'],
  british_avios:   ['british'],
  aeroplan:        ['aeroplan'],
  flying_blue:     ['flyingblue'],
  singapore:       ['singapore'],
  emirates:        ['emirates'],
  virgin_atlantic: ['virginatlantic'],
  turkish:         ['turkish'],
  ana:             ['ana'],
  avianca:         ['avianca'],
  southwest:       ['southwest'],
};

function sourcesForBalances(balances: Partial<Record<PointsCurrency, number>>): string[] {
  const sources = new Set<string>();
  for (const [currency, amount] of Object.entries(balances)) {
    if (!amount || amount <= 0) continue;
    const mapped = CURRENCY_TO_SOURCES[currency as PointsCurrency] ?? [];
    mapped.forEach((s) => sources.add(s));
  }
  return sources.size > 0 ? Array.from(sources) : []; // empty = search all
}

// ── Nearby airport clusters ─────────────────────────────────────────────────
const NEARBY_AIRPORTS: Record<string, string[]> = {
  // US — New York area
  JFK: ['EWR', 'LGA'], EWR: ['JFK', 'LGA'], LGA: ['JFK', 'EWR'],
  // US — Los Angeles area
  LAX: ['BUR', 'SNA', 'LGB', 'ONT'], BUR: ['LAX', 'SNA'], SNA: ['LAX', 'BUR'],
  // US — San Francisco Bay
  SFO: ['OAK', 'SJC'], OAK: ['SFO', 'SJC'], SJC: ['SFO', 'OAK'],
  // US — Chicago
  ORD: ['MDW'], MDW: ['ORD'],
  // US — Dallas
  DFW: ['DAL'], DAL: ['DFW'],
  // US — Miami / South Florida
  MIA: ['FLL', 'PBI'], FLL: ['MIA', 'PBI'],
  // US — Boston
  BOS: ['PVD', 'MHT'],
  // US — Washington DC
  DCA: ['IAD', 'BWI'], IAD: ['DCA', 'BWI'], BWI: ['DCA', 'IAD'],
  // Europe — London
  LHR: ['LGW', 'STN', 'LCY', 'LTN'], LGW: ['LHR', 'STN'], STN: ['LHR', 'LGW'],
  // Europe — Paris
  CDG: ['ORY'], ORY: ['CDG'],
  // Europe — Amsterdam / Brussels
  AMS: ['BRU', 'DUS'], BRU: ['AMS', 'DUS'],
  // Europe — Frankfurt / Munich
  FRA: ['DUS', 'MUC'], MUC: ['FRA', 'NUE'],
  // Europe — Rome
  FCO: ['CIA'], CIA: ['FCO'],
  // Europe — Zurich / Geneva
  ZRH: ['GVA', 'BSL'], GVA: ['ZRH'],
  // Asia — Tokyo
  NRT: ['HND'], HND: ['NRT'],
  // Asia — Seoul
  ICN: ['GMP'], GMP: ['ICN'],
  // Asia — Singapore / KL
  SIN: ['KUL'], KUL: ['SIN'],
  // Asia — Bangkok
  BKK: ['DMK'], DMK: ['BKK'],
  // Asia — Hong Kong / Macau
  HKG: ['MFM'], MFM: ['HKG'],
  // India
  DEL: ['AGR'], BOM: ['PNQ'], MAA: ['BLR'], BLR: ['MAA'],
  // Australia
  SYD: ['MEL', 'BNE'], MEL: ['SYD', 'BNE'],
};

// ── Cash price estimates ────────────────────────────────────────────────────
const US_AIRPORTS = new Set([
  'JFK','EWR','LGA','LAX','SFO','ORD','DFW','MIA','BOS','SEA','ATL','DEN','LAS',
  'PHX','SAN','MCO','IAH','MSP','DTW','PHL','BWI','DCA','IAD','SLC','PDX','HNL',
  'AUS','RDU','MCI','BDL','BUF','OAK','SJC','BUR','SNA','ONT','LGB','MDW','DAL',
  'FLL','PBI','PVD','MHT','CMH','CLE','PIT','IND','MEM',
]);
const CA_AIRPORTS = new Set(['YYZ','YVR','YUL','YYC','YEG','YOW','YHZ']);

const CASH_PRICES: Record<'domestic' | 'shortHaul' | 'longHaul', Record<CabinClass, number>> = {
  domestic:  { ECONOMY: 350,  PREMIUM_ECONOMY: 650,  BUSINESS: 900,   FIRST: 1800  },
  shortHaul: { ECONOMY: 700,  PREMIUM_ECONOMY: 1200, BUSINESS: 2500,  FIRST: 5000  },
  longHaul:  { ECONOMY: 1000, PREMIUM_ECONOMY: 1600, BUSINESS: 4800,  FIRST: 10000 },
};

function estimateCashPrice(origin: string, destination: string, cabin: CabinClass): number {
  const domestic = (US_AIRPORTS.has(origin) && US_AIRPORTS.has(destination))
                || (CA_AIRPORTS.has(origin) && CA_AIRPORTS.has(destination));
  if (domestic) return CASH_PRICES.domestic[cabin];
  // Rough long-haul if either end is non-US/CA
  const bothUS = US_AIRPORTS.has(origin) || CA_AIRPORTS.has(origin)
              || US_AIRPORTS.has(destination) || CA_AIRPORTS.has(destination);
  return bothUS ? CASH_PRICES.shortHaul[cabin] : CASH_PRICES.longHaul[cabin];
}

// ── Program rules database ──────────────────────────────────────────────────
const PROGRAM_RULES: Record<string, Record<string, string>> = {
  'Aeroplan': {
    fuelSurcharges: 'None on most partners; minor YQ on Lufthansa Group flights (~$50–100)',
    stopovers: 'One free stopover on round trips; layovers ≤24h free via Excursionist Perk',
    partnerBooking: 'Book Star Alliance partners at aeroplan.com or by phone (+1 800-361-5373)',
    awardExpiry: '18 months of account inactivity',
    sweetSpots: 'Business to Europe 65k–75k; Lufthansa First ~87.5k; short-haul economy 6k–15k',
    bookingTip: 'Excursionist Perk: add one free one-way segment on a round trip; call for hidden partner inventory',
  },
  'United MileagePlus': {
    fuelSurcharges: 'None on United-operated; carrier surcharges on Lufthansa/Swiss/Brussels (~$200–400)',
    stopovers: 'Not allowed on one-way awards; one stopover permitted on round trips',
    partnerBooking: 'Star Alliance partners bookable at united.com; phone for hard-to-find space',
    awardExpiry: '18 months of account inactivity',
    sweetSpots: 'ANA Business JFK–Tokyo 88k round trip; United Polaris domestic 25k–30k one-way',
    bookingTip: 'Turn on flexible dates search; one-ways at exactly half the round-trip price',
  },
  'American AAdvantage': {
    fuelSurcharges: 'None on American-operated; heavy surcharges on British Airways and Iberia-operated flights (~£300–600)',
    stopovers: 'Not permitted on any AAdvantage awards',
    partnerBooking: 'Web Specials bookable online; most partner awards require calling (+1 800-882-8880)',
    awardExpiry: '18 months of account inactivity',
    sweetSpots: 'Cathay Pacific First one-way 70k; JAL Business one-way 60k; Finnair Business 57.5k',
    bookingTip: 'JAL releases more inventory to AAdvantage than to other programs — check early',
  },
  'British Airways Avios': {
    fuelSurcharges: 'Heavy surcharges on BA transatlantic (~£300–600 each way). Zero surcharges on AA, Iberia, Aer Lingus, Alaska',
    stopovers: 'No free stopovers; every segment priced by distance independently (Avios)',
    partnerBooking: 'Book AA domestic/Caribbean, Iberia Europe, Aer Lingus at ba.com; distance-based pricing',
    awardExpiry: 'Points never expire while account is active (one transaction per 36 months keeps account alive)',
    sweetSpots: 'AA short-haul domestic 7.5k–10k Avios; Iberia/Vueling Europe hops 4.5k–13k',
    bookingTip: 'Never book BA transatlantic with Avios — surcharges destroy value. Use Avios on AA or Iberia instead',
  },
  'Air France/KLM Flying Blue': {
    fuelSurcharges: 'Moderate; significantly lower than BA. Promo Awards (monthly flash sales) often waive them',
    stopovers: 'Stopovers allowed on some routes',
    partnerBooking: 'SkyTeam partners at flyingblue.com; some non-SkyTeam by phone',
    awardExpiry: '24 months of account inactivity',
    sweetSpots: 'Promo Awards: Business US–Europe from 50k; Economy US–Europe 25k',
    bookingTip: 'Check flyingblue.com on the 1st of each month — Promo Awards release then and sell out fast',
  },
  'Singapore KrisFlyer': {
    fuelSurcharges: 'None on Singapore Airlines-operated flights; applies on partners',
    stopovers: 'One free stopover in Singapore on round trips; no stopovers on one-ways',
    partnerBooking: 'Singapore Airlines at singaporeair.com; Star Alliance partners by phone (+65 6789-8188)',
    awardExpiry: '3-year hard expiry from date of earning — miles cannot be extended',
    sweetSpots: 'Singapore Suites JFK–FRA or SIN ~86–143k; Business SIN–US round trip 96k',
    bookingTip: 'Suites availability opens 355 days in advance — book the day the calendar opens; expiry is hard so plan carefully',
  },
  'Emirates Skywards': {
    fuelSurcharges: 'None on Emirates-operated flights',
    stopovers: 'One free stopover in Dubai on round trips',
    partnerBooking: 'Emirates flights only through Skywards; partner airlines limited',
    awardExpiry: '36 months of account inactivity',
    sweetSpots: 'First Class A380 JFK–DXB ~100k one-way; Business from ~75k one-way',
    bookingTip: 'Emirates First Class with Shower Spa and Lounge access; book 330+ days out for best availability',
  },
  'Virgin Atlantic Flying Club': {
    fuelSurcharges: 'None on Virgin Atlantic or Delta partner bookings — a key advantage',
    stopovers: 'Not available on standard awards',
    partnerBooking: 'Book Delta at virginatlantic.com with no surcharges; ANA via Flying Club is a landmark sweet spot',
    awardExpiry: '36 months of account inactivity',
    sweetSpots: 'ANA Business JFK–TYO 47.5k one-way (best transatlantic-equivalent value); Delta One domestic from 15k',
    bookingTip: 'ANA inventory visible at virginatlantic.com is identical to ANA.com — confirm there first',
  },
  'Turkish Miles&Smiles': {
    fuelSurcharges: 'None on Turkish Airlines-operated; applies on some partners',
    stopovers: 'Free stopover in Istanbul on round trips',
    partnerBooking: 'Star Alliance partners online and by phone (+1 888-793-6762); lower rates than most programs',
    awardExpiry: '3 years of account inactivity',
    sweetSpots: 'United Polaris Business JFK–LAX ~7.5k miles; Star Alliance Business intercontinental from 45k',
    bookingTip: 'Call Turkish for partner space not visible online; some of the lowest published award rates in Star Alliance',
  },
  'ANA Mileage Club': {
    fuelSurcharges: 'None on ANA-operated; applies on some partners',
    stopovers: 'Stopovers permitted on round trips',
    partnerBooking: 'Book Star Alliance at ana.co.jp; often releases own inventory to partners before showing on own site',
    awardExpiry: '36 months from earning',
    sweetSpots: 'ANA Business round trip US–Japan 88k; ANA First round trip US–Japan 120k',
    bookingTip: 'ANA Round The World business award is exceptional value at 88k–95k for up to 4 stops',
  },
  'Chase Ultimate Rewards': {
    fuelSurcharges: 'Depends on which transfer partner you choose',
    stopovers: 'Depends on transfer partner rules',
    partnerBooking: 'Transfer 1:1 to United, Hyatt, Southwest, British Avios, Flying Blue, Singapore KrisFlyer, Air Canada Aeroplan, Iberia, Emirates, and others',
    awardExpiry: 'Points never expire while account is open',
    sweetSpots: 'Transfer to Aeroplan for business class Europe; to Virgin Atlantic for ANA sweet spot; to Flying Blue for Promo Awards',
    bookingTip: 'Transfers are instant to most partners; never transfer without confirmed award availability',
  },
  'Amex Membership Rewards': {
    fuelSurcharges: 'Depends on transfer partner chosen',
    stopovers: 'Depends on transfer partner rules',
    partnerBooking: 'Transfer to Delta, British Avios, Air Canada Aeroplan, Singapore KrisFlyer, ANA (at 2:1 ratio), Air France Flying Blue, Emirates, Etihad, and others',
    awardExpiry: 'Points never expire while account is open',
    sweetSpots: 'Transfer to ANA at 2:1 for Star Alliance business; to Virgin Atlantic for ANA 47.5k sweet spot; to Singapore for Suites',
    bookingTip: 'ANA transfers at 2 MR = 1 ANA mile — factor this 2:1 ratio into your CPP calculation before comparing options',
  },
  'Citi ThankYou': {
    fuelSurcharges: 'Depends on transfer partner chosen',
    stopovers: 'Depends on transfer partner rules',
    partnerBooking: 'Transfer to Turkish Miles&Smiles, Flying Blue, Singapore KrisFlyer, Avianca LifeMiles, Etihad, Qatar, Virgin Atlantic, and others at 1:1',
    awardExpiry: 'Points expire 24 months after account closure; active accounts keep points indefinitely',
    sweetSpots: 'Transfer to Turkish for ultra-low Star Alliance rates; to Singapore KrisFlyer for Suites',
    bookingTip: 'Turkish Miles&Smiles transfers are instant — ideal when you find last-minute Star Alliance award space',
  },
  'Capital One Miles': {
    fuelSurcharges: 'Depends on transfer partner chosen',
    stopovers: 'Depends on transfer partner rules',
    partnerBooking: 'Transfer to Turkish (1:0.75 ratio), Flying Blue, Avianca LifeMiles, Singapore KrisFlyer, Air Canada Aeroplan, Emirates, and others',
    awardExpiry: 'Points never expire while account is open',
    sweetSpots: 'Transfer to Turkish at 0.75 ratio for Star Alliance; to Flying Blue for Promo Awards',
    bookingTip: 'Turkish transfer at 1000 Capital One = 750 Miles&Smiles — less favorable than Chase/Amex, so compare carefully',
  },
};

// ── Date helpers ─────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// ── Tool definitions ─────────────────────────────────────────────────────────
export const TOOLS: Tool[] = [
  {
    name: 'search_flights',
    description: 'Search for available award flights on a specific route and date. Returns programs with open award space, mileage costs, seat counts, and flight details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin:      { type: 'string', description: 'Origin airport IATA code (e.g. JFK)' },
        destination: { type: 'string', description: 'Destination airport IATA code (e.g. LHR)' },
        date:        { type: 'string', description: 'Travel date in YYYY-MM-DD format' },
        cabin: {
          type: 'string',
          enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
          description: 'Cabin class',
        },
        adults: { type: 'number', description: 'Number of adult passengers' },
      },
      required: ['origin', 'destination', 'date', 'cabin', 'adults'],
    },
  },
  {
    name: 'search_nearby_dates',
    description: 'Search award availability across a window of dates around the target date. Use when the exact date has no availability, or to find the cheapest date in a flexible range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin:      { type: 'string', description: 'Origin IATA code' },
        destination: { type: 'string', description: 'Destination IATA code' },
        target_date: { type: 'string', description: 'Center of the search window (YYYY-MM-DD)' },
        cabin:       { type: 'string', enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] },
        adults:      { type: 'number' },
        days_before: { type: 'number', description: 'Days before target to search (default 3, max 7)' },
        days_after:  { type: 'number', description: 'Days after target to search (default 3, max 7)' },
      },
      required: ['origin', 'destination', 'target_date', 'cabin', 'adults'],
    },
  },
  {
    name: 'search_nearby_airports',
    description: 'Search alternate airports near the origin or destination. Use when no availability found at primary airports, or to find a better connection through a nearby hub.',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin:      { type: 'string', description: 'Primary origin IATA code' },
        destination: { type: 'string', description: 'Primary destination IATA code' },
        date:        { type: 'string', description: 'Travel date YYYY-MM-DD' },
        cabin:       { type: 'string', enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] },
        adults:      { type: 'number' },
        check_origin_alternates:      { type: 'boolean', description: 'Try alternate origin airports (default true)' },
        check_destination_alternates: { type: 'boolean', description: 'Try alternate destination airports (default true)' },
      },
      required: ['origin', 'destination', 'date', 'cabin', 'adults'],
    },
  },
  {
    name: 'get_cash_price',
    description: 'Get the estimated cash price for a route and cabin so you can calculate cents per point (CPP) for any redemption.',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin:      { type: 'string', description: 'Origin IATA code' },
        destination: { type: 'string', description: 'Destination IATA code' },
        date:        { type: 'string', description: 'Travel date YYYY-MM-DD' },
        cabin:       { type: 'string', enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] },
        adults:      { type: 'number' },
      },
      required: ['origin', 'destination', 'date', 'cabin', 'adults'],
    },
  },
  {
    name: 'check_seat_count',
    description: 'Check how many award seats remain for a route/date/cabin. Use to verify availability is real before finalising a recommendation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin:      { type: 'string' },
        destination: { type: 'string' },
        date:        { type: 'string', description: 'YYYY-MM-DD' },
        cabin:       { type: 'string', enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] },
        program:     { type: 'string', description: 'Filter to one mileage program key (e.g. "aeroplan"). Omit to see all.' },
      },
      required: ['origin', 'destination', 'date', 'cabin'],
    },
  },
  {
    name: 'get_transfer_partners',
    description: 'Return bookable partners, transfer partners, and app-specific sweet spots for a given points or miles program.',
    input_schema: {
      type: 'object' as const,
      properties: {
        currency: {
          type: 'string',
          enum: ['chase_ur','amex_mr','citi_typ','capital_one','united','delta','american',
                 'british_avios','aeroplan','flying_blue','singapore','emirates',
                 'virgin_atlantic','turkish','ana','avianca','southwest'],
          description: 'Points or miles program key',
        },
      },
      required: ['currency'],
    },
  },
  {
    name: 'get_program_rules',
    description: 'Get fuel surcharge policy, stopover rules, partner booking instructions, and sweet spots for a specific program. Always call this before recommending a redemption.',
    input_schema: {
      type: 'object' as const,
      properties: {
        program_name: {
          type: 'string',
          description: 'Full program name, e.g. "Aeroplan", "United MileagePlus", "British Airways Avios", "Chase Ultimate Rewards", "Amex Membership Rewards"',
        },
      },
      required: ['program_name'],
    },
  },
];

// ── Tool call handler ─────────────────────────────────────────────────────────
export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  flightCache: Map<string, FlightOffer[]>,
  pointsBalances: Partial<Record<PointsCurrency, number>> = {},
  adapter: FlightAdapter = seatsAeroAdapter
): Promise<{ result: ToolResultBlockParam['content']; flights?: FlightOffer[] }> {

  // ── search_flights ─────────────────────────────────────────────────────────
  if (toolName === 'search_flights') {
    const params = {
      origin:      toolInput.origin as string,
      destination: toolInput.destination as string,
      date:        toolInput.date as string,
      cabin:       toolInput.cabin as CabinClass,
      adults:      toolInput.adults as number,
      sources:     sourcesForBalances(pointsBalances),
    };

    const flights = await adapter.searchFlights(params);
    const cacheKey = `${params.origin}-${params.destination}-${params.date}-${params.cabin}`;
    flightCache.set(cacheKey, flights);

    const summary = flights.map((f) => ({
      id: f.id,
      airline: f.airline,
      flightNumber: f.flightNumber,
      departure: f.departure,
      arrival: f.arrival,
      stops: f.stops,
      connections: f.connections,
      aircraft: f.aircraft,
      cabin: f.cabin,
      program: f.source,
      milesRequired: f.mileageCost,
      seatsAvailable: f.remainingSeats,
    }));

    return {
      result: JSON.stringify({ count: flights.length, flights: summary }),
      flights,
    };
  }

  // ── search_nearby_dates ────────────────────────────────────────────────────
  if (toolName === 'search_nearby_dates') {
    const origin      = toolInput.origin as string;
    const destination = toolInput.destination as string;
    const targetDate  = toolInput.target_date as string;
    const cabin       = toolInput.cabin as CabinClass;
    const adults      = toolInput.adults as number;
    const daysBefore  = Math.min(Number(toolInput.days_before ?? 3), 7);
    const daysAfter   = Math.min(Number(toolInput.days_after ?? 3), 7);

    const dateResults: Array<{
      date: string;
      programsAvailable: number;
      lowestMiles: number | null;
      programs: Array<{ program: string; miles: number; seats: number }>;
    }> = [];

    const allFlights: FlightOffer[] = [];

    for (let d = -daysBefore; d <= daysAfter; d++) {
      const date = addDays(targetDate, d);
      const flights = await adapter.searchFlights({ origin, destination, date, cabin, adults, sources: sourcesForBalances(pointsBalances) });

      const available = flights.filter((f) => f.available !== false);
      const programs = available.map((f) => ({
        program: f.source ?? '',
        miles: f.mileageCost ?? 0,
        seats: f.remainingSeats ?? 0,
      }));
      const lowestMiles = programs.length > 0
        ? Math.min(...programs.map((p) => p.miles))
        : null;

      dateResults.push({ date, programsAvailable: available.length, lowestMiles, programs });
      allFlights.push(...available);
    }

    const bestDate = dateResults
      .filter((d) => d.lowestMiles !== null)
      .sort((a, b) => (a.lowestMiles ?? Infinity) - (b.lowestMiles ?? Infinity))[0] ?? null;

    return {
      result: JSON.stringify({
        route: `${origin.toUpperCase()} → ${destination.toUpperCase()}`,
        cabin,
        searchedDates: dateResults.length,
        datesWithAvailability: dateResults.filter((d) => d.programsAvailable > 0).length,
        dates: dateResults,
        bestDate: bestDate ? { date: bestDate.date, lowestMiles: bestDate.lowestMiles } : null,
      }),
      flights: allFlights,
    };
  }

  // ── search_nearby_airports ─────────────────────────────────────────────────
  if (toolName === 'search_nearby_airports') {
    const origin      = (toolInput.origin as string).toUpperCase();
    const destination = (toolInput.destination as string).toUpperCase();
    const date        = toolInput.date as string;
    const cabin       = toolInput.cabin as CabinClass;
    const adults      = toolInput.adults as number;
    const checkOrigin = toolInput.check_origin_alternates !== false;
    const checkDest   = toolInput.check_destination_alternates !== false;

    const altOrigins      = checkOrigin ? (NEARBY_AIRPORTS[origin] ?? []) : [];
    const altDestinations = checkDest   ? (NEARBY_AIRPORTS[destination] ?? []) : [];

    const searches: Array<{ origin: string; destination: string }> = [];
    if (altOrigins.length > 0) {
      altOrigins.forEach((o) => searches.push({ origin: o, destination }));
    }
    if (altDestinations.length > 0) {
      altDestinations.forEach((d) => searches.push({ origin, destination: d }));
    }

    const results: Array<{
      origin: string;
      destination: string;
      available: boolean;
      programsFound: number;
      lowestMiles: number | null;
      programs: Array<{ program: string; miles: number; seats: number }>;
    }> = [];

    const allFlights: FlightOffer[] = [];

    for (const combo of searches) {
      const flights = await adapter.searchFlights({ ...combo, date, cabin, adults, sources: sourcesForBalances(pointsBalances) });
      const available = flights.filter((f) => f.available !== false);
      const programs = available.map((f) => ({
        program: f.source ?? '',
        miles: f.mileageCost ?? 0,
        seats: f.remainingSeats ?? 0,
      }));

      results.push({
        origin: combo.origin,
        destination: combo.destination,
        available: available.length > 0,
        programsFound: available.length,
        lowestMiles: programs.length > 0 ? Math.min(...programs.map((p) => p.miles)) : null,
        programs,
      });
      allFlights.push(...available);
    }

    return {
      result: JSON.stringify({
        primaryRoute: `${origin} → ${destination}`,
        alternatesChecked: results.length,
        alternateOriginsTried: altOrigins,
        alternateDestinationsTried: altDestinations,
        results: results.filter((r) => r.available),
        noAlternatesFound: altOrigins.length === 0 && altDestinations.length === 0
          ? `No known alternate airports for ${origin} or ${destination}`
          : undefined,
      }),
      flights: allFlights,
    };
  }

  // ── get_cash_price ─────────────────────────────────────────────────────────
  if (toolName === 'get_cash_price') {
    const origin      = (toolInput.origin as string).toUpperCase();
    const destination = (toolInput.destination as string).toUpperCase();
    const cabin       = toolInput.cabin as CabinClass;
    const adults      = (toolInput.adults as number) ?? 1;

    const perPerson = estimateCashPrice(origin, destination, cabin);
    const total     = perPerson * adults;

    return {
      result: JSON.stringify({
        origin,
        destination,
        cabin,
        adults,
        estimatedCashPricePerPerson: perPerson,
        estimatedCashPriceTotal: total,
        currency: 'USD',
        note: 'Estimated from typical market fares; actual prices vary by airline and booking window',
      }),
    };
  }

  // ── check_seat_count ───────────────────────────────────────────────────────
  if (toolName === 'check_seat_count') {
    const origin      = (toolInput.origin as string).toUpperCase();
    const destination = (toolInput.destination as string).toUpperCase();
    const date        = toolInput.date as string;
    const cabin       = toolInput.cabin as CabinClass;
    const filterProg  = toolInput.program as string | undefined;

    const cacheKey = `${origin}-${destination}-${date}-${cabin}`;
    const cached   = flightCache.get(cacheKey);
    const flights  = cached ?? await adapter.searchFlights({ origin, destination, date, cabin, adults: 1, sources: sourcesForBalances(pointsBalances) });

    if (!cached) flightCache.set(cacheKey, flights);

    let relevant = flights.filter((f) => f.available !== false);
    if (filterProg) {
      relevant = relevant.filter((f) => f.source === filterProg);
    }

    const seatData = relevant.map((f) => ({
      program: f.source ?? 'unknown',
      flight: `${f.airline}${f.flightNumber}`,
      seatsAvailable: f.remainingSeats ?? 0,
      milesRequired: f.mileageCost,
      sufficientFor1: (f.remainingSeats ?? 0) >= 1,
      sufficientFor2: (f.remainingSeats ?? 0) >= 2,
    }));

    return {
      result: JSON.stringify({
        route: `${origin} → ${destination}`,
        date,
        cabin,
        programFilter: filterProg ?? 'all',
        seats: seatData,
        totalProgramsWithAvailability: seatData.filter((s) => s.seatsAvailable > 0).length,
      }),
    };
  }

  // ── get_transfer_partners ──────────────────────────────────────────────────
  if (toolName === 'get_transfer_partners') {
    const currency = toolInput.currency as PointsCurrency;
    const program  = PROGRAMS[currency];
    if (!program) return { result: JSON.stringify({ error: `Unknown currency: ${currency}` }) };

    const isAirline = ['united','delta','american','british_avios','aeroplan',
      'flying_blue','singapore','emirates','virgin_atlantic','turkish','ana','avianca','southwest',
    ].includes(currency);

    return {
      result: JSON.stringify({
        currency,
        name: program.name,
        type: isAirline ? 'airline_miles' : 'bank_points',
        ...(isAirline
          ? { bookablePartners: program.transfers, note: 'Book these airlines directly — no transfer needed.' }
          : { transferPartners: program.transfers, note: 'Transfer to one of these airline programs first, then book.' }
        ),
        sweetSpots: program.sweetSpots,
      }),
    };
  }

  // ── get_program_rules ──────────────────────────────────────────────────────
  if (toolName === 'get_program_rules') {
    const name = toolInput.program_name as string;

    // Exact match first, then case-insensitive partial match
    const rules = PROGRAM_RULES[name]
      ?? Object.entries(PROGRAM_RULES).find(([k]) =>
           k.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes(k.toLowerCase())
         )?.[1];

    if (!rules) {
      return {
        result: JSON.stringify({
          error: `No rules found for "${name}"`,
          availablePrograms: Object.keys(PROGRAM_RULES),
        }),
      };
    }

    return { result: JSON.stringify({ program: name, ...rules }) };
  }

  return { result: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
}
