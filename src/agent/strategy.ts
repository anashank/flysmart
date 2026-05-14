import {
  PROGRAMS,
  POINT_VALUES_CPP,
  type PointsCurrency,
  type SweetSpot,
} from '@/data/programs';
import type { FlightOffer, CabinClass } from '@/adapters/types';

export interface RedemptionStrategy {
  currency: PointsCurrency;
  currencyName: string;
  transferPartner: string;
  pointsNeeded: number;
  pointsAvailable: number;
  milesRequired: number;
  centsPerPoint: number;
  canAfford: boolean;
  isPool?: boolean;
  poolContribution?: { bankCurrency: PointsCurrency; bankPointsNeeded: number; airlineMilesContributed: number };
  sweetSpot: SweetSpot | null;
  flight: FlightOffer;
  bookingSteps: string[];
}

export interface EvaluationResult {
  topStrategies: RedemptionStrategy[];
  summary: string;
}

const CABIN_CASH_ESTIMATE: Record<CabinClass, number> = {
  ECONOMY: 700,
  PREMIUM_ECONOMY: 1300,
  BUSINESS: 3500,
  FIRST: 6000,
};

// Transfer ratios: bank points → airline miles (>1 means less favourable)
const TRANSFER_RATIOS: Partial<Record<PointsCurrency, Record<string, number>>> = {
  capital_one: { 'Turkish Miles&Smiles': 2 / 1.5 },
  amex_mr:     { 'ANA Mileage Club': 2 },
};

// Maps the string name used in bank transfer lists → the PointsCurrency key
const PARTNER_NAME_TO_KEY: Record<string, PointsCurrency> = {
  'United MileagePlus':         'united',
  'Delta SkyMiles':             'delta',
  'American AAdvantage':        'american',
  'British Airways Avios':      'british_avios',
  'Air Canada Aeroplan':        'aeroplan',
  'Air France/KLM Flying Blue': 'flying_blue',
  'Singapore KrisFlyer':        'singapore',
  'Emirates Skywards':          'emirates',
  'Virgin Atlantic Flying Club':'virgin_atlantic',
  'Turkish Miles&Smiles':       'turkish',
  'ANA Mileage Club':           'ana',
  'Avianca LifeMiles':          'avianca',
  'Southwest Rapid Rewards':    'southwest',
};

const AIRLINE_PROGRAMS = new Set<PointsCurrency>([
  'united', 'delta', 'american', 'british_avios', 'aeroplan',
  'flying_blue', 'singapore', 'emirates', 'virgin_atlantic',
  'turkish', 'ana', 'avianca', 'southwest',
]);

function getBankPointsNeeded(currency: PointsCurrency, partner: string, milesNeeded: number): number {
  const ratio = TRANSFER_RATIOS[currency]?.[partner] ?? 1;
  return Math.ceil(milesNeeded * ratio);
}

function buildBookingSteps(
  currency: PointsCurrency,
  partner: string,
  pointsNeeded: number,
  flight: FlightOffer,
  pool?: RedemptionStrategy['poolContribution']
): string[] {
  const program = PROGRAMS[currency];

  if (pool) {
    const bankProgram = PROGRAMS[pool.bankCurrency];
    return [
      `You have ${pool.airlineMilesContributed.toLocaleString()} ${program?.name ?? currency} miles — you need ${pointsNeeded.toLocaleString()} total`,
      `Transfer ${pool.bankPointsNeeded.toLocaleString()} ${bankProgram?.name ?? pool.bankCurrency} points to ${program?.name ?? currency} to cover the shortfall`,
      `Wait up to 24–48 hours for the transfer to post`,
      `Search award availability on the ${partner} website for ${flight.departure.split('T')[0]}`,
      `Book the ${flight.cabin.toLowerCase().replace('_', ' ')} award and save your confirmation`,
    ];
  }

  if (AIRLINE_PROGRAMS.has(currency)) {
    return [
      `Log in to your ${program?.name ?? currency} account`,
      `Search award availability for ${flight.departure.split('T')[0]}: ${flight.airline} flight ${flight.flightNumber}`,
      `Select the ${flight.cabin.toLowerCase().replace('_', ' ')} award — ${pointsNeeded.toLocaleString()} miles`,
      `Complete booking and save your confirmation email`,
    ];
  }

  return [
    `Log in to your ${program?.name ?? currency} account`,
    `Transfer ${pointsNeeded.toLocaleString()} points to ${partner}`,
    `Search for award availability on the ${partner} website or app`,
    `Select ${flight.airline} flight ${flight.flightNumber} on ${flight.departure.split('T')[0]}`,
    `Complete the booking and confirm your email`,
  ];
}

export function evaluateRedemptions(
  flights: FlightOffer[],
  pointsBalances: Partial<Record<PointsCurrency, number>>
): EvaluationResult {
  if (flights.length === 0) {
    return { topStrategies: [], summary: 'No award availability found for this route and date.' };
  }

  const strategies: RedemptionStrategy[] = [];

  for (const flight of flights) {
    const milesRequired = flight.mileageCost ?? flight.price;
    if (!milesRequired) continue;

    const partnerName = flight.source ?? null;
    const cabin = flight.cabin;
    const estimatedCashValue = CABIN_CASH_ESTIMATE[cabin];

    for (const [currencyKey, balance] of Object.entries(pointsBalances)) {
      const currency = currencyKey as PointsCurrency;
      if (!balance || balance <= 0) continue;

      const program = PROGRAMS[currency];
      if (!program) continue;

      const eligiblePartners = partnerName
        ? program.transfers.filter((t) => t === partnerName)
        : program.transfers;

      for (const partner of eligiblePartners) {
        const pointsNeeded = getBankPointsNeeded(currency, partner, milesRequired);
        const centsPerPoint = estimatedCashValue > 0 ? (estimatedCashValue * 100) / pointsNeeded : 0;
        const sweetSpot = program.sweetSpots.find(
          (s) => s.program.includes(partner) && s.cabin === cabin.toLowerCase()
        ) ?? null;

        strategies.push({
          currency,
          currencyName: program.name,
          transferPartner: partner,
          pointsNeeded,
          pointsAvailable: balance,
          milesRequired,
          centsPerPoint: Math.round(centsPerPoint * 100) / 100,
          canAfford: balance >= pointsNeeded,
          sweetSpot,
          flight,
          bookingSteps: buildBookingSteps(currency, partner, pointsNeeded, flight),
        });

        // ── Pooling: can the user top up a short airline balance with a bank transfer? ──
        // Only applies when this is a bank currency transferring to an airline program
        if (!AIRLINE_PROGRAMS.has(currency)) {
          const airlineKey = PARTNER_NAME_TO_KEY[partner];
          const airlineBalance = airlineKey ? (pointsBalances[airlineKey] ?? 0) : 0;

          if (airlineKey && airlineBalance > 0 && airlineBalance < milesRequired) {
            const shortfall = milesRequired - airlineBalance;
            const bankPointsNeeded = getBankPointsNeeded(currency, partner, shortfall);
            const totalAffordable = airlineBalance + Math.floor(balance / (TRANSFER_RATIOS[currency]?.[partner] ?? 1));

            if (totalAffordable >= milesRequired && balance >= bankPointsNeeded) {
              const cppPooled = estimatedCashValue > 0
                ? (estimatedCashValue * 100) / (airlineBalance + shortfall)
                : 0;

              strategies.push({
                currency,
                currencyName: program.name,
                transferPartner: partner,
                pointsNeeded: bankPointsNeeded,
                pointsAvailable: balance,
                milesRequired,
                centsPerPoint: Math.round(cppPooled * 100) / 100,
                canAfford: true,
                isPool: true,
                poolContribution: {
                  bankCurrency: currency,
                  bankPointsNeeded,
                  airlineMilesContributed: airlineBalance,
                },
                sweetSpot,
                flight,
                bookingSteps: buildBookingSteps(currency, partner, milesRequired, flight, {
                  bankCurrency: currency,
                  bankPointsNeeded,
                  airlineMilesContributed: airlineBalance,
                }),
              });
            }
          }
        }
      }
    }
  }

  // Sort: affordable first, pools surfaced high, then by CPP
  strategies.sort((a, b) => {
    if (a.canAfford !== b.canAfford) return a.canAfford ? -1 : 1;
    if (a.isPool !== b.isPool) return a.isPool ? -1 : 1;
    return b.centsPerPoint - a.centsPerPoint;
  });

  // Deduplicate per (currency, partner, isPool)
  const seen = new Set<string>();
  const deduped = strategies.filter((s) => {
    const key = `${s.currency}:${s.transferPartner}:${s.isPool ? 'pool' : 'direct'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const top = deduped.slice(0, 5);

  const poolStrategy = top.find((s) => s.isPool);
  const summary = top.length > 0
    ? poolStrategy
      ? `Pool strategy available: combine your ${PROGRAMS[poolStrategy.poolContribution!.bankCurrency]?.name} points with your ${PROGRAMS[poolStrategy.currency]?.name} miles to cover this redemption.`
      : `Best: ${top[0].currencyName} → ${top[0].transferPartner} for ${top[0].milesRequired.toLocaleString()} miles (${top[0].centsPerPoint}¢/point)`
    : 'No transfer options found for your balances on this route.';

  return { topStrategies: top, summary };
}
