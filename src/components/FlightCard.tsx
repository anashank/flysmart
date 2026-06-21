import type { FlightOffer } from '@/adapters/types';

interface Props {
  flight: FlightOffer;
}

// IATA carrier code → full airline name
const AIRLINE_NAMES: Record<string, string> = {
  UA: 'United Airlines',   AA: 'American Airlines', DL: 'Delta Air Lines',
  BA: 'British Airways',   VS: 'Virgin Atlantic',   LH: 'Lufthansa',
  LX: 'Swiss',             OS: 'Austrian',          SN: 'Brussels Airlines',
  AC: 'Air Canada',        AF: 'Air France',        KL: 'KLM',
  SQ: 'Singapore Airlines',EK: 'Emirates',          TK: 'Turkish Airlines',
  NH: 'ANA',               AV: 'Avianca',           WN: 'Southwest',
  B6: 'JetBlue',           AS: 'Alaska Airlines',   QR: 'Qatar Airways',
  CX: 'Cathay Pacific',    JL: 'Japan Airlines',    MH: 'Malaysia Airlines',
  TG: 'Thai Airways',      BR: 'EVA Air',           CI: 'China Airlines',
  OZ: 'Asiana',            KE: 'Korean Air',        AI: 'Air India',        MS: 'EgyptAir',
  ET: 'Ethiopian',         SA: 'South African',     UX: 'Air Europa',
  IB: 'Iberia',            VY: 'Vueling',           EI: 'Aer Lingus',
  SK: 'SAS',               AY: 'Finnair',           TP: 'TAP Air Portugal',
  LO: 'LOT Polish Airlines', A3: 'Aegean Airlines',
  WY: 'Oman Air',          RJ: 'Royal Jordanian',   GF: 'Gulf Air',
};

const AEROPLAN_CABIN: Record<string, string> = {
  ECONOMY: 'eco', PREMIUM_ECONOMY: 'eco', BUSINESS: 'biz', FIRST: 'first',
};
const UNITED_CABIN: Record<string, string> = {
  ECONOMY: '3', PREMIUM_ECONOMY: '4', BUSINESS: '7', FIRST: '1',
};

// Program source → booking URL (pre-filled where possible)
function bookingUrl(source: string, origin: string, destination: string, date: string, cabin: string): string {
  const d = date.split('T')[0] ?? '';
  const ac = AEROPLAN_CABIN[cabin] ?? 'biz';
  const uc = UNITED_CABIN[cabin] ?? '7';
  const urls: Record<string, string> = {
    aeroplan:       `https://www.aircanada.com/aeroplan/redeem/availability/outbound?org0=${origin}&dest0=${destination}&departureDate0=${d}&ADT=1&lang=en-CA&tripType=O&cabin=${ac}`,
    united:         `https://www.united.com/en/us/flight-search/book-a-flight/results/rev?f=${origin}&t=${destination}&d=${d}&tt=1&at=1&sc=${uc}&px=1&taxng=1&idx=1`,
    delta:          `https://www.delta.com/us/en/flight-search/book-a-flight`,
    american:       `https://www.aa.com/booking/find-flights`,
    british:        `https://www.britishairways.com/en-us/executive-club/spending-avios/use-avios-for-flights`,
    flyingblue:     `https://www.flyingblue.com/en/spend/flights/search`,
    singapore:      `https://www.singaporeair.com/en_UK/ppsclub-krisflyer/krisflyer/redeem-miles/book-reward-flight/`,
    emirates:       `https://www.emirates.com/english/skywards/use-your-miles/book-a-flight/`,
    virginatlantic: `https://flightrewards.virginatlantic.com/`,
    turkish:        `https://www.turkishairlines.com/en-us/miles-smiles/awards/book-award-ticket/`,
    ana:            `https://www.ana.co.jp/en/us/amc/mileage-use/award-flights/`,
    avianca:        `https://www.avianca.com/us/en/use-miles/flights/`,
    southwest:      `https://www.southwest.com/air/booking/select.html`,
    jetblue:        `https://trueblue.jetblue.com/redeem`,
    alaska:         `https://www.alaskaair.com/booking/flights`,
  };
  return urls[source] ?? '#';
}

function formatDate(iso: string) {
  if (!iso || iso.startsWith('T') || !iso.includes('-')) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cabinBadgeColor(cabin: string) {
  switch (cabin) {
    case 'FIRST':           return 'var(--av-gold)';
    case 'BUSINESS':        return 'var(--av-accent)';
    case 'PREMIUM_ECONOMY': return '#a78bfa';
    default:                return 'var(--av-muted)';
  }
}

function programLabel(source: string): string {
  const labels: Record<string, string> = {
    aeroplan: 'Aeroplan', united: 'United', delta: 'Delta', american: 'American',
    flyingblue: 'Flying Blue', british: 'Avios', singapore: 'KrisFlyer',
    ana: 'ANA', emirates: 'Emirates', turkish: 'Turkish', virginatlantic: 'Virgin Atlantic',
    avianca: 'LifeMiles', southwest: 'Southwest', jetblue: 'TrueBlue', alaska: 'Alaska',
  };
  return labels[source] ?? source;
}

export default function FlightCard({ flight }: Props) {
  const badgeColor = cabinBadgeColor(flight.cabin);
  const origin = flight.segments[0]?.departure.iataCode ?? '---';
  const dest   = flight.segments[flight.segments.length - 1]?.arrival.iataCode ?? '---';

  // Parse comma-separated airline codes
  const airlineCodes = flight.airline
    ? flight.airline.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const url = bookingUrl(flight.source ?? '', origin, dest, flight.departure, flight.cabin);

  return (
    <div
      className="rounded-lg border p-4 transition-all duration-200 hover:border-[var(--av-accent)]/40"
      style={{ background: 'var(--av-surface)', borderColor: 'var(--av-border)' }}
    >
      {/* Header: program badge + cabin */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--av-input)] text-[var(--av-text-dim)] border border-[var(--av-border)]">
          {programLabel(flight.source ?? '')}
        </span>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded border"
          style={{ color: badgeColor, borderColor: `${badgeColor}40` }}
        >
          {flight.cabin.replace('_', ' ')}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-center">
          <div className="font-mono text-xl font-bold text-[var(--av-text)]">{origin}</div>
          <div className="font-mono text-xs text-[var(--av-muted)]">{formatDate(flight.departure)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px bg-[var(--av-border)]" />
            <span className="text-[var(--av-accent)] text-xs">✈</span>
            <div className="flex-1 h-px bg-[var(--av-border)]" />
          </div>
          <div className="font-mono text-xs text-[var(--av-muted)] text-center">
            {flight.stops === 0
              ? 'Nonstop'
              : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            {flight.stops > 0 && airlineCodes.length > 1 && (
              <div className="mt-1 flex flex-col items-center gap-0.5">
                {airlineCodes.map((code, i) => (
                  <div key={code} className="flex flex-col items-center">
                    <span className="text-[10px] text-[var(--av-text-dim)]">
                      {code} · {AIRLINE_NAMES[code] ?? 'Unknown'}
                    </span>
                    {i < airlineCodes.length - 1 && (
                      <span className="text-[9px] text-[var(--av-border)]">↓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-xl font-bold text-[var(--av-text)]">{dest}</div>
          <div className="font-mono text-xs text-[var(--av-muted)]">{formatDate(flight.arrival)}</div>
        </div>
      </div>

      {/* Airlines — individual rows */}
      {airlineCodes.length > 0 && (
        <div className="mb-3 space-y-1">
          {airlineCodes.map((code) => (
            <div key={code} className="flex items-center gap-2">
              <img
                src={`https://www.google.com/s2/favicons?domain=${airlineDomain(code)}&sz=16`}
                alt={code}
                className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="font-mono text-xs text-[var(--av-text-dim)]">
                {code} · {AIRLINE_NAMES[code] ?? 'Unknown Airline'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: cost + seats + book button */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--av-border)]">
        <div>
          <span className="font-mono text-lg font-bold text-[var(--av-gold)]">
            {(flight.mileageCost ?? flight.price).toLocaleString()} mi
          </span>
          {flight.taxes != null && flight.taxes > 0 && (
            <span className="font-mono text-xs text-[var(--av-muted)] ml-2">
              +${(flight.taxes / 100).toFixed(2)} taxes
            </span>
          )}
          {flight.remainingSeats != null && flight.remainingSeats > 0 && (
            <div className="font-mono text-xs text-[var(--av-muted)] mt-0.5">
              {flight.remainingSeats} seat{flight.remainingSeats !== 1 ? 's' : ''} left
            </div>
          )}
        </div>

        {url !== '#' && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs px-3 py-1.5 rounded border transition-colors"
            style={{
              color: 'var(--av-accent)',
              borderColor: 'var(--av-accent)40',
              background: 'var(--av-accent)10',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--av-accent)20';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--av-accent)80';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--av-accent)10';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--av-accent)40';
            }}
          >
            Book Award →
          </a>
        )}
      </div>
    </div>
  );
}

function airlineDomain(code: string): string {
  const domains: Record<string, string> = {
    UA: 'united.com', AA: 'aa.com', DL: 'delta.com', BA: 'britishairways.com',
    VS: 'virginatlantic.com', LH: 'lufthansa.com', LX: 'swiss.com', OS: 'austrian.com',
    SN: 'brusselsairlines.com', AC: 'aircanada.com', AF: 'airfrance.com', KL: 'klm.com',
    SQ: 'singaporeair.com', EK: 'emirates.com', TK: 'turkishairlines.com', NH: 'ana.co.jp',
    AV: 'avianca.com', WN: 'southwest.com', B6: 'jetblue.com', AS: 'alaskaair.com',
    QR: 'qatarairways.com', CX: 'cathaypacific.com', JL: 'jal.com', IB: 'iberia.com',
    AI: 'airindia.in', AY: 'finnair.com', SK: 'flysas.com', TP: 'flytap.com', EI: 'aerlingus.com',
    LO: 'lot.com', A3: 'aegeanair.com', WY: 'omanair.com', RJ: 'rj.com', GF: 'gulfair.com',
  };
  return domains[code] ?? 'google.com';
}
