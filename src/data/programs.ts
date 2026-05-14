export type PointsCurrency =
  // Credit cards
  | 'chase_ur'
  | 'amex_mr'
  | 'citi_typ'
  | 'capital_one'
  // Frequent flyer
  | 'united'
  | 'delta'
  | 'american'
  | 'british_avios'
  | 'aeroplan'
  | 'flying_blue'
  | 'singapore'
  | 'emirates'
  | 'virgin_atlantic'
  | 'turkish'
  | 'ana'
  | 'avianca'
  | 'southwest';

export type ProgramCategory = 'card' | 'airline';

export interface ProgramMeta {
  label: string;       // short display name
  color: string;       // brand color for badge
  bg: string;          // badge background
  initials: string;    // 2-3 char badge text
  category: ProgramCategory;
  logoUrl?: string;    // optional external logo
}

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export const PROGRAM_META: Record<PointsCurrency, ProgramMeta> = {
  // ── Credit cards ──────────────────────────────────────────────
  chase_ur:     { label: 'Chase UR',          color: '#fff', bg: '#1a3a6b', initials: 'UR', category: 'card',    logoUrl: favicon('chase.com') },
  amex_mr:      { label: 'Amex MR',           color: '#fff', bg: '#016FD0', initials: 'MR', category: 'card',    logoUrl: favicon('americanexpress.com') },
  citi_typ:     { label: 'Citi TYP',          color: '#fff', bg: '#c41230', initials: 'TY', category: 'card',    logoUrl: favicon('citi.com') },
  capital_one:  { label: 'Capital One',       color: '#fff', bg: '#c8102e', initials: 'C1', category: 'card',    logoUrl: favicon('capitalone.com') },
  // ── Frequent flyer ────────────────────────────────────────────
  united:       { label: 'United Miles',      color: '#fff', bg: '#003087', initials: 'UA', category: 'airline', logoUrl: favicon('united.com') },
  delta:        { label: 'Delta SkyMiles',    color: '#fff', bg: '#c01933', initials: 'DL', category: 'airline', logoUrl: favicon('delta.com') },
  american:     { label: 'AA AAdvantage',     color: '#fff', bg: '#0078d2', initials: 'AA', category: 'airline', logoUrl: favicon('aa.com') },
  british_avios:{ label: 'BA Avios',          color: '#fff', bg: '#1e3a6e', initials: 'BA', category: 'airline', logoUrl: favicon('britishairways.com') },
  aeroplan:     { label: 'Aeroplan',          color: '#fff', bg: '#d22630', initials: 'AC', category: 'airline', logoUrl: favicon('aircanada.com') },
  flying_blue:  { label: 'Flying Blue',       color: '#fff', bg: '#002157', initials: 'FB', category: 'airline', logoUrl: favicon('airfrance.com') },
  singapore:    { label: 'KrisFlyer',         color: '#fff', bg: '#0033a0', initials: 'SQ', category: 'airline', logoUrl: favicon('singaporeair.com') },
  emirates:     { label: 'Emirates Skywards', color: '#fff', bg: '#c8102e', initials: 'EK', category: 'airline', logoUrl: favicon('emirates.com') },
  virgin_atlantic:{ label: 'Virgin Atlantic', color: '#fff', bg: '#e2001a', initials: 'VS', category: 'airline', logoUrl: favicon('virginatlantic.com') },
  turkish:      { label: 'Turkish Miles',     color: '#fff', bg: '#c8102e', initials: 'TK', category: 'airline', logoUrl: favicon('turkishairlines.com') },
  ana:          { label: 'ANA Mileage',       color: '#fff', bg: '#1e3a8a', initials: 'NH', category: 'airline', logoUrl: favicon('ana.co.jp') },
  avianca:      { label: 'Avianca LifeMiles', color: '#fff', bg: '#c8102e', initials: 'AV', category: 'airline', logoUrl: favicon('avianca.com') },
  southwest:    { label: 'Southwest RR',      color: '#333', bg: '#ffbf27', initials: 'WN', category: 'airline', logoUrl: favicon('southwest.com') },
};

export interface SweetSpot {
  route: string;
  program: string;
  pointsOneWay: number;
  pointsRoundTrip: number;
  cabin: 'business' | 'first' | 'economy';
  notes: string;
}

export interface LoyaltyProgram {
  name: string;
  transfers: string[];
  sweetSpots: SweetSpot[];
}

export const PROGRAMS: Partial<Record<PointsCurrency, LoyaltyProgram>> = {
  // ── Airline programs — "transfers" = airlines you can book award space on ──
  united: {
    name: 'United MileagePlus',
    transfers: ['Singapore Airlines', 'ANA', 'Lufthansa', 'Swiss', 'Austrian', 'Air Canada', 'Turkish Airlines', 'Air New Zealand', 'Avianca', 'Copa Airlines', 'EVA Air', 'Aegean'],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'United MileagePlus → Lufthansa/Swiss', pointsOneWay: 60000, pointsRoundTrip: 120000, cabin: 'business', notes: 'Book Lufthansa or Swiss business via united.com. No fuel surcharges on United-ticketed awards.' },
      { route: 'US/India to Singapore (one-way)', program: 'United MileagePlus → Singapore Airlines', pointsOneWay: 43000, pointsRoundTrip: 86000, cabin: 'business', notes: 'Book Singapore Airlines business class directly on united.com using United miles.' },
      { route: 'US to Japan (one-way)', program: 'United MileagePlus → ANA', pointsOneWay: 55000, pointsRoundTrip: 110000, cabin: 'business', notes: 'ANA business via United miles. Book on united.com.' },
    ],
  },
  delta: {
    name: 'Delta SkyMiles',
    transfers: ['Air France', 'KLM', 'Korean Air', 'Virgin Atlantic', 'Aeromexico', 'WestJet', 'LATAM', 'ITA Airways'],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'Delta → Air France/KLM', pointsOneWay: 50000, pointsRoundTrip: 100000, cabin: 'business', notes: 'Variable pricing — check delta.com for current rates. Flying Blue Promo awards sometimes cheaper.' },
      { route: 'US to London (one-way)', program: 'Delta → Virgin Atlantic Upper Class', pointsOneWay: 50000, pointsRoundTrip: 100000, cabin: 'business', notes: 'Virgin Atlantic Upper Class via Delta miles on delta.com.' },
    ],
  },
  american: {
    name: 'AA AAdvantage',
    transfers: ['British Airways', 'Cathay Pacific', 'Japan Airlines', 'Qatar Airways', 'Iberia', 'Finnair', 'Malaysia Airlines', 'Royal Air Maroc', 'Alaska Airlines'],
    sweetSpots: [
      { route: 'US to Asia (one-way)', program: 'AAdvantage → Cathay Pacific', pointsOneWay: 60000, pointsRoundTrip: 120000, cabin: 'business', notes: 'Cathay Pacific business class via AA miles. Book on aa.com.' },
      { route: 'US to Middle East/Asia (one-way)', program: 'AAdvantage → Qatar QSuites', pointsOneWay: 70000, pointsRoundTrip: 140000, cabin: 'business', notes: 'Qatar QSuites via AAdvantage miles. One of the best products in the sky.' },
      { route: 'US to Japan (one-way)', program: 'AAdvantage → Japan Airlines', pointsOneWay: 60000, pointsRoundTrip: 120000, cabin: 'business', notes: 'JAL Sakura business class — excellent product. Book via aa.com.' },
    ],
  },
  british_avios: {
    name: 'British Airways Avios',
    transfers: ['American Airlines', 'Iberia', 'Aer Lingus', 'Alaska Airlines', 'Vueling', 'LEVEL'],
    sweetSpots: [
      { route: 'US East Coast to London (one-way)', program: 'Avios → British Airways', pointsOneWay: 50000, pointsRoundTrip: 100000, cabin: 'business', notes: 'Distance-based pricing. JFK-LHR direct is ~50k Avios in Club World.' },
      { route: 'Short-haul US (one-way)', program: 'Avios → American Airlines', pointsOneWay: 7500, pointsRoundTrip: 15000, cabin: 'economy', notes: 'Avios shines on short AA flights under 1,150 miles — just 7,500 points.' },
    ],
  },
  aeroplan: {
    name: 'Air Canada Aeroplan',
    transfers: ['Lufthansa', 'Swiss', 'Austrian', 'Singapore Airlines', 'ANA', 'United', 'Turkish Airlines', 'Air China', 'TAP Air Portugal', 'Brussels Airlines'],
    sweetSpots: [
      { route: 'US/Canada to Europe (one-way)', program: 'Aeroplan → Lufthansa/Swiss', pointsOneWay: 65000, pointsRoundTrip: 130000, cabin: 'business', notes: 'No fuel surcharges. Book Lufthansa, Swiss, Austrian business on aeroplan.com.' },
      { route: 'India/Asia to Singapore (one-way)', program: 'Aeroplan → Singapore Airlines', pointsOneWay: 35000, pointsRoundTrip: 70000, cabin: 'business', notes: 'Great rates for intra-Asia SIA business. Book on aeroplan.com.' },
    ],
  },
  flying_blue: {
    name: 'Air France/KLM Flying Blue',
    transfers: ['Air France', 'KLM', 'Delta', 'Korean Air', 'Kenya Airways', 'TAROM'],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'Flying Blue → Air France/KLM', pointsOneWay: 50000, pointsRoundTrip: 100000, cabin: 'business', notes: 'Check Promo Rewards monthly — can drop to 37,500 points on specific routes.' },
      { route: 'Europe to US (one-way)', program: 'Flying Blue → Air France La Première', pointsOneWay: 100000, pointsRoundTrip: 200000, cabin: 'first', notes: 'Air France First Class — one of the best first class products. Rare but bookable.' },
    ],
  },
  singapore: {
    name: 'Singapore KrisFlyer',
    transfers: ['Singapore Airlines', 'SilkAir', 'Scoot', 'Lufthansa', 'Swiss', 'Austrian', 'ANA', 'Air New Zealand', 'Virgin Australia', 'Thai Airways', 'Shenzhen Airlines'],
    sweetSpots: [
      { route: 'Any to Singapore/Asia (one-way)', program: 'KrisFlyer → Singapore Airlines Business', pointsOneWay: 35000, pointsRoundTrip: 70000, cabin: 'business', notes: 'Book SIA business directly — excellent product. Short-haul Asia as low as 15k miles.' },
      { route: 'US/Europe to Singapore (one-way)', program: 'KrisFlyer → Singapore Suites (First)', pointsOneWay: 86000, pointsRoundTrip: 172000, cabin: 'first', notes: 'Singapore Suites is the gold standard in first class. Book early on singaporeair.com.' },
      { route: 'India to Singapore (one-way)', program: 'KrisFlyer → Singapore Airlines', pointsOneWay: 15000, pointsRoundTrip: 30000, cabin: 'business', notes: 'MAA/BOM/DEL to SIN is short-haul — very affordable in KrisFlyer miles.' },
    ],
  },
  emirates: {
    name: 'Emirates Skywards',
    transfers: ['Emirates', 'flydubai'],
    sweetSpots: [
      { route: 'US to Dubai (one-way)', program: 'Emirates Skywards → Emirates First', pointsOneWay: 85000, pointsRoundTrip: 170000, cabin: 'first', notes: 'Emirates First Class with shower — book on emirates.com. Fuel surcharges apply.' },
      { route: 'US to Dubai (one-way)', program: 'Emirates Skywards → Emirates Business', pointsOneWay: 58000, pointsRoundTrip: 116000, cabin: 'business', notes: 'Emirates Business Class on A380 or 777. Book direct on emirates.com.' },
    ],
  },
  virgin_atlantic: {
    name: 'Virgin Atlantic Flying Club',
    transfers: ['Virgin Atlantic', 'Delta', 'Air New Zealand', 'ANA', 'Ethiopian Airlines'],
    sweetSpots: [
      { route: 'US to Japan (roundtrip)', program: 'Virgin Atlantic → ANA Business (roundtrip)', pointsOneWay: 47500, pointsRoundTrip: 88000, cabin: 'business', notes: 'The legendary ANA sweet spot — 88k points roundtrip, no fuel surcharges. Book on virginatlantic.com.' },
      { route: 'US to London (one-way)', program: 'Virgin Atlantic → Upper Class', pointsOneWay: 50000, pointsRoundTrip: 100000, cabin: 'business', notes: 'Book Virgin Atlantic Upper Class on their own metal via flyingclub.virginatlantic.com.' },
    ],
  },
  turkish: {
    name: 'Turkish Miles&Smiles',
    transfers: ['Turkish Airlines', 'United', 'Lufthansa', 'Swiss', 'ANA', 'Singapore Airlines', 'Air Canada', 'Thai Airways'],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'Miles&Smiles → United transatlantic', pointsOneWay: 45000, pointsRoundTrip: 90000, cabin: 'business', notes: 'Cheapest way to fly Star Alliance business class transatlantic. Book on turkishairlines.com.' },
      { route: 'US to Asia (one-way)', program: 'Miles&Smiles → ANA/Singapore Business', pointsOneWay: 45000, pointsRoundTrip: 90000, cabin: 'business', notes: 'Flat rate Star Alliance pricing makes long-haul Asia a steal.' },
    ],
  },
  ana: {
    name: 'ANA Mileage Club',
    transfers: ['ANA', 'Lufthansa', 'Swiss', 'Austrian', 'Singapore Airlines', 'United', 'Air Canada', 'Thai Airways'],
    sweetSpots: [
      { route: 'US to Japan (roundtrip)', program: 'ANA → ANA Business roundtrip', pointsOneWay: 75000, pointsRoundTrip: 88000, cabin: 'business', notes: 'ANA own-metal roundtrip at 88k is a steal but requires booking via phone. No fuel surcharges.' },
    ],
  },
  avianca: {
    name: 'Avianca LifeMiles',
    transfers: ['United', 'Lufthansa', 'Swiss', 'ANA', 'Singapore Airlines', 'Air Canada', 'Turkish Airlines', 'Copa Airlines'],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'LifeMiles → Lufthansa/Swiss Business', pointsOneWay: 63000, pointsRoundTrip: 126000, cabin: 'business', notes: 'No fuel surcharges. LifeMiles prices Star Alliance awards competitively.' },
      { route: 'US to Asia (one-way)', program: 'LifeMiles → ANA/Singapore Business', pointsOneWay: 63000, pointsRoundTrip: 126000, cabin: 'business', notes: 'Flat-rate Star Alliance pricing. Great for long-haul Asia business.' },
    ],
  },
  southwest: {
    name: 'Southwest Rapid Rewards',
    transfers: ['Southwest Airlines', 'Icelandair'],
    sweetSpots: [
      { route: 'US domestic (one-way)', program: 'Rapid Rewards → Southwest', pointsOneWay: 8000, pointsRoundTrip: 16000, cabin: 'economy', notes: 'Best value on domestic US routes. Companion Pass doubles the value of your points.' },
    ],
  },
  // ── Credit card programs ──────────────────────────────────────
  chase_ur: {
    name: 'Chase Ultimate Rewards',
    transfers: [
      'United MileagePlus', 'World of Hyatt', 'British Airways Avios',
      'Air France/KLM Flying Blue', 'Singapore KrisFlyer', 'Southwest Rapid Rewards',
      'Virgin Atlantic Flying Club', 'Aer Lingus AerClub', 'Iberia Plus', 'Emirates Skywards',
    ],
    sweetSpots: [
      { route: 'US to Japan (roundtrip)', program: 'Virgin Atlantic Flying Club → ANA', pointsOneWay: 47500, pointsRoundTrip: 88000, cabin: 'business', notes: 'Book ANA business class roundtrip via Virgin Atlantic. No fuel surcharges.' },
      { route: 'US to Europe (one-way)', program: 'Air France/KLM Flying Blue', pointsOneWay: 50000, pointsRoundTrip: 100000, cabin: 'business', notes: 'Flying Blue Promo Rewards can drop to 37,500 points during promotions.' },
      { route: 'US to Europe (one-way)', program: 'British Airways Avios → American Airlines', pointsOneWay: 32500, pointsRoundTrip: 65000, cabin: 'business', notes: 'Distance-based. Best for direct transatlantic routes under 4,000 miles.' },
    ],
  },
  amex_mr: {
    name: 'American Express Membership Rewards',
    transfers: [
      'Delta SkyMiles', 'Air Canada Aeroplan', 'British Airways Avios',
      'Air France/KLM Flying Blue', 'ANA Mileage Club', 'Singapore KrisFlyer',
      'Emirates Skywards', 'Etihad Guest', 'Virgin Atlantic Flying Club', 'Avianca LifeMiles',
    ],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'Air Canada Aeroplan', pointsOneWay: 65000, pointsRoundTrip: 130000, cabin: 'business', notes: 'No fuel surcharges on partner awards. Great for Lufthansa, Swiss, Air Canada.' },
      { route: 'US to Japan (one-way)', program: 'ANA Mileage Club', pointsOneWay: 88000, pointsRoundTrip: 88000, cabin: 'business', notes: 'ANA roundtrip business at 88k. Transfer 2:1 from Amex MR (need 176k MR).' },
      { route: 'US to Middle East (one-way)', program: 'Avianca LifeMiles', pointsOneWay: 63000, pointsRoundTrip: 126000, cabin: 'business', notes: 'No fuel surcharges. Good for United, Lufthansa, ANA.' },
    ],
  },
  citi_typ: {
    name: 'Citi ThankYou Points',
    transfers: [
      'Air France/KLM Flying Blue', 'Turkish Miles&Smiles', 'Singapore KrisFlyer',
      'Qatar Privilege Club', 'Avianca LifeMiles', 'Virgin Atlantic Flying Club',
      'Etihad Guest', 'Eva Air Infinity MileageLands', 'Cathay Pacific Asia Miles',
    ],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'Turkish Miles&Smiles', pointsOneWay: 45000, pointsRoundTrip: 90000, cabin: 'business', notes: 'Cheapest Star Alliance business class. United transatlantic at 45k one-way.' },
      { route: 'US to Middle East (one-way)', program: 'Qatar Privilege Club', pointsOneWay: 70000, pointsRoundTrip: 140000, cabin: 'business', notes: 'Qatar QSuites — one of the best business class products.' },
    ],
  },
  capital_one: {
    name: 'Capital One Miles',
    transfers: [
      'Air Canada Aeroplan', 'Air France/KLM Flying Blue', 'Turkish Miles&Smiles',
      'Singapore KrisFlyer', 'Avianca LifeMiles', 'British Airways Avios',
      'Cathay Pacific Asia Miles', 'Emirates Skywards', 'Etihad Guest',
    ],
    sweetSpots: [
      { route: 'US to Europe (one-way)', program: 'Air Canada Aeroplan', pointsOneWay: 65000, pointsRoundTrip: 130000, cabin: 'business', notes: 'No fuel surcharges on most partner awards.' },
      { route: 'US to Europe (one-way)', program: 'Turkish Miles&Smiles', pointsOneWay: 45000, pointsRoundTrip: 90000, cabin: 'business', notes: 'Transfer 2:1.5. Cheapest way to fly Star Alliance business class.' },
    ],
  },
};

export const POINT_VALUES_CPP: Record<PointsCurrency, number> = {
  chase_ur: 2.05, amex_mr: 2.0, citi_typ: 1.8, capital_one: 1.85,
  united: 1.3, delta: 1.2, american: 1.4, british_avios: 1.5,
  aeroplan: 1.6, flying_blue: 1.4, singapore: 1.5, emirates: 1.3,
  virgin_atlantic: 1.5, turkish: 1.4, ana: 1.6, avianca: 1.5, southwest: 1.3,
};

export const CURRENCY_LABELS: Record<PointsCurrency, string> = {
  chase_ur: 'Chase UR', amex_mr: 'Amex MR', citi_typ: 'Citi TYP', capital_one: 'Capital One',
  united: 'United Miles', delta: 'Delta SkyMiles', american: 'AA AAdvantage',
  british_avios: 'BA Avios', aeroplan: 'Aeroplan', flying_blue: 'Flying Blue',
  singapore: 'KrisFlyer', emirates: 'Emirates', virgin_atlantic: 'Virgin Atlantic',
  turkish: 'Turkish Miles', ana: 'ANA Miles', avianca: 'LifeMiles', southwest: 'Southwest RR',
};
