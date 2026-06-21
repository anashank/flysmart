'use client';

import { useState } from 'react';
import { type PointsCurrency } from '@/data/programs';
import AirportInput from './AirportInput';
import ProgramSelector from './ProgramSelector';

export interface SearchFormValues {
  origin: string;
  destination: string;
  date: string;
  cabin: string;
  adults: number;
  pointsBalances: Partial<Record<PointsCurrency, number>>;
}

interface Props {
  onSearch: (values: SearchFormValues) => void;
  loading: boolean;
}

const CABINS = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;

export default function SearchForm({ onSearch, loading }: Props) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [cabin, setCabin] = useState<string>('BUSINESS');
  const [adults, setAdults] = useState(1);
  const [pointsBalances, setPointsBalances] = useState<Partial<Record<PointsCurrency, number>>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({ origin, destination, date, cabin, adults, pointsBalances });
  }

const inputClass =
    'w-full bg-[#0a1526] border border-[var(--av-border)] rounded-lg px-4 py-3 text-[var(--av-text)] placeholder-[var(--av-muted)] focus:outline-none focus:border-[var(--av-accent)] focus:ring-1 focus:ring-[var(--av-accent)]/30 hover:border-[var(--av-accent)]/50 hover:bg-[#0d1e35] transition-colors font-mono text-sm uppercase tracking-widest';

  const labelClass = 'block text-xs text-[var(--av-text-dim)] uppercase tracking-widest mb-1.5 font-mono';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Route row */}
      <div className="grid grid-cols-2 gap-4">
        <AirportInput
          label="From"
          value={origin}
          onChange={setOrigin}
          placeholder="JFK or New York"
        />
        <AirportInput
          label="To"
          value={destination}
          onChange={setDestination}
          placeholder="LHR or London"
        />
      </div>

      {/* Date + cabin + adults */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            className={`${inputClass} tracking-normal`}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              e.target.blur();
            }}
            required
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className={labelClass}>Cabin</label>
          <select
            className={`${inputClass} cursor-pointer`}
            value={cabin}
            onChange={(e) => setCabin(e.target.value)}
          >
            {CABINS.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Passengers</label>
          <input
            type="number"
            min={1}
            max={9}
            className={`${inputClass} tracking-normal`}
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <ProgramSelector values={pointsBalances} onChange={setPointsBalances} />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-lg font-mono text-sm uppercase tracking-widest font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: loading
            ? '#0a1526'
            : 'linear-gradient(135deg, var(--av-accent) 0%, #0099bb 100%)',
          color: loading ? 'var(--av-muted)' : 'var(--av-bg)',
          boxShadow: loading ? 'none' : '0 0 20px rgba(0, 212, 255, 0.25)',
          transition: 'box-shadow 0.2s, filter 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.8), 0 0 80px rgba(0, 212, 255, 0.4)';
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.2)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.25)';
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
        }}
      >
        {loading ? 'Searching...' : 'Find Award Flights'}
      </button>
    </form>
  );
}
