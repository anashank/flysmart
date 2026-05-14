import type { FlightOffer } from '@/adapters/types';

interface Props {
  flight: FlightOffer;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cabinBadgeColor(cabin: string) {
  switch (cabin) {
    case 'FIRST': return '#f59e0b';
    case 'BUSINESS': return '#00d4ff';
    case 'PREMIUM_ECONOMY': return '#a78bfa';
    default: return '#4a6280';
  }
}

function programLabel(source: string): string {
  const labels: Record<string, string> = {
    aeroplan: 'Aeroplan',
    united: 'United',
    delta: 'Delta',
    flyingblue: 'Flying Blue',
    british: 'Avios',
    singapore: 'KrisFlyer',
    ana: 'ANA',
    emirates: 'Emirates',
    etihad: 'Etihad',
    turkish: 'Turkish',
    virgin: 'Virgin Atlantic',
    avianca: 'LifeMiles',
    qatar: 'Qatar',
    cathay: 'Asia Miles',
  };
  return labels[source] ?? source;
}

export default function FlightCard({ flight }: Props) {
  const badgeColor = cabinBadgeColor(flight.cabin);
  const origin = flight.segments[0]?.departure.iataCode ?? '---';
  const dest = flight.segments[flight.segments.length - 1]?.arrival.iataCode ?? '---';

  return (
    <div
      className="rounded-lg border p-4 transition-all duration-200 hover:border-[#00d4ff]/40"
      style={{ background: '#0f1829', borderColor: '#1a2d4a' }}
    >
      {/* Header: airline + cabin */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#4a6280]">{flight.airline}</span>
          <span className="font-mono text-sm font-bold text-[#e2eaf5]">{flight.flightNumber || 'Multiple'}</span>
        </div>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded border"
          style={{ color: badgeColor, borderColor: `${badgeColor}40` }}
        >
          {flight.cabin.replace('_', ' ')}
        </span>
      </div>

      {/* Route timeline */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-center">
          <div className="font-mono text-xl font-bold text-[#e2eaf5]">{origin}</div>
          <div className="font-mono text-xs text-[#4a6280]">{formatDate(flight.departure)}</div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px bg-[#1a2d4a]" />
            {flight.stops > 0 && (
              <div className="flex gap-1">
                {Array.from({ length: flight.stops }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                ))}
              </div>
            )}
            <div className="flex-1 h-px bg-[#1a2d4a]" />
            <span className="text-[#00d4ff]">✈</span>
          </div>
          <div className="font-mono text-xs text-[#4a6280]">
            {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="text-center">
          <div className="font-mono text-xl font-bold text-[#e2eaf5]">{dest}</div>
          <div className="font-mono text-xs text-[#4a6280]">{formatDate(flight.arrival)}</div>
        </div>
      </div>

      {/* Award cost */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1a2d4a]">
        <div className="flex items-center gap-2">
          {flight.source && (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#0a1526] text-[#7a9ab8] border border-[#1a2d4a]">
              {programLabel(flight.source)}
            </span>
          )}
          {flight.remainingSeats != null && flight.remainingSeats > 0 && (
            <span className="font-mono text-xs text-[#4a6280]">
              {flight.remainingSeats} seat{flight.remainingSeats !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="font-mono text-lg font-bold text-[#f59e0b]">
          {(flight.mileageCost ?? flight.price).toLocaleString()} mi
        </span>
      </div>
    </div>
  );
}
