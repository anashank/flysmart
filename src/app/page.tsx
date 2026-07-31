'use client';

import { useState } from 'react';
import SearchForm, { type SearchFormValues } from '@/components/SearchForm';
import ResultsPanel from '@/components/ResultsPanel';
import ThemeToggle from '@/components/ThemeToggle';
import type { FlightOffer } from '@/adapters/types';

type AppState = 'idle' | 'streaming' | 'results' | 'error';

interface Results {
  flights: FlightOffer[];
  recommendation: string;
  searchParams: SearchFormValues;
}

function PlaneSVG({ size = 38 }: { size?: number }) {
  const scale = size / 38;
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none">
      <ellipse cx="19" cy="19" rx="14" ry="14" fill="var(--av-accent)" fillOpacity="0.07" />
      <path d="M8 19.5L18 14l10 1.5-2 4-10 1L8 19.5z" fill="var(--av-accent)" fillOpacity="0.9" />
      <path d="M14 19l-5 5 2 0.5 6-3.5" fill="var(--av-accent)" fillOpacity="0.6" />
      <path d="M8 19.5l-2-3 3 1.5" fill="var(--av-accent)" fillOpacity="0.6" />
      <circle cx="22" cy="17.5" r="1" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

function Cloud({ style }: { style: React.CSSProperties }) {
  return (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" style={style} className="absolute">
      <ellipse cx="60" cy="34" rx="52" ry="14" fill="var(--av-border)" fillOpacity="0.7" />
      <ellipse cx="40" cy="28" rx="28" ry="16" fill="var(--av-border)" fillOpacity="0.7" />
      <ellipse cx="72" cy="24" rx="24" ry="18" fill="var(--av-border)" fillOpacity="0.7" />
      <ellipse cx="52" cy="20" rx="20" ry="16" fill="var(--av-border)" fillOpacity="0.7" />
    </svg>
  );
}

function FlightLoader({ message }: { message: string }) {
  return (
    <div className="mt-8 rounded-xl border border-[var(--av-border)] overflow-hidden" style={{ background: 'var(--av-bg)' }}>
      <div className="relative h-32 overflow-hidden">

        {/* Scrolling clouds — different speeds for parallax depth */}
        <Cloud style={{ top: 4,  animation: 'cloudScroll 6s linear infinite',        opacity: 0.5 }} />
        <Cloud style={{ top: 16, animation: 'cloudScroll 9s linear infinite -3s',    opacity: 0.35, transform: 'scaleX(0.7)' }} />
        <Cloud style={{ top: 2,  animation: 'cloudScroll 7s linear infinite -1.5s',  opacity: 0.45 }} />
        <Cloud style={{ top: 20, animation: 'cloudScroll 11s linear infinite -5s',   opacity: 0.25, transform: 'scaleX(1.3)' }} />
        <Cloud style={{ top: 8,  animation: 'cloudScroll 8s linear infinite -4s',    opacity: 0.4,  transform: 'scaleX(0.85)' }} />
        <Cloud style={{ top: 18, animation: 'cloudScroll 10s linear infinite -7s',   opacity: 0.3,  transform: 'scaleX(1.1)' }} />

        {/* Contrail — fixed behind the plane */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            right: '46%',
            width: '28%',
            height: '2px',
            background: 'linear-gradient(to left, var(--av-accent)30, transparent)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            right: '46%',
            width: '18%',
            height: '1px',
            marginTop: 3,
            background: 'linear-gradient(to left, var(--av-accent)20, transparent)',
          }}
        />

        {/* Plane — centred, gentle bob only */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'planeBob 3s ease-in-out infinite', zIndex: 10 }}
        >
          <span style={{ fontSize: 36, lineHeight: 1, display: 'block', color: 'var(--av-accent)' }}>✈</span>
        </div>
      </div>

      {/* Status row */}
      <div className="border-t border-[var(--av-border)] px-5 py-3 flex items-center gap-2.5">
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--av-accent)] opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--av-accent)]" />
        </span>
        <span className="font-mono text-xs text-[var(--av-text-dim)] tracking-wide">{message}</span>
      </div>

      <style>{`
        @keyframes cloudScroll {
          from { transform: translateX(110vw); }
          to   { transform: translateX(-160px); }
        }
        @keyframes planeBob {
          0%, 100% { transform: translate(-50%, -50%) rotate(1deg); }
          50%       { transform: translate(-50%, calc(-50% - 6px)) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [streamingRec, setStreamingRec] = useState('');
  const [error, setError] = useState('');
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number } | null>(null);

  async function handleSearch(values: SearchFormValues) {
    setAppState('streaming');
    setStatus('Connecting...');
    setStreamingRec('');
    setResults(null);
    setError('');

    const accFlights: FlightOffer[] = [];
    let accRec = '';

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Search failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Stream closed without a done event — resolve whatever we have
          setAppState((s) => {
            if (s === 'streaming') {
              if (accFlights.length > 0 || accRec) {
                setResults({ flights: accFlights, recommendation: accRec, searchParams: values });
                return 'results';
              }
              setError('No results found. Try different dates or airports.');
              return 'error';
            }
            return s;
          });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6));

          if (event.type === 'status') {
            setStatus(event.message);
          } else if (event.type === 'flights') {
            accFlights.push(...event.flights);
          } else if (event.type === 'token') {
            accRec += event.text;
            setStreamingRec(accRec);
            // Switch to results layout as soon as text starts arriving
            setAppState('results');
            setResults({ flights: accFlights, recommendation: accRec, searchParams: values });
          } else if (event.type === 'done') {
            setResults({ flights: accFlights, recommendation: event.recommendation, searchParams: values });
            setAppState('results');
          } else if (event.type === 'rateLimit') {
            setRateLimit({ limit: event.limit, remaining: event.remaining });
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setAppState('error');
    }
  }

  const isLoading = appState === 'streaming';

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--av-bg)' }}>
      {/* Aurora background */}
      <div className="aurora">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>
      <header className="relative z-10 border-b px-6 py-4" style={{ backdropFilter: 'blur(12px)', background: 'var(--av-header)', borderColor: 'var(--av-border)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[var(--av-accent)] text-xl">✈</span>
            <span className="font-mono font-bold text-[var(--av-text)] tracking-widest uppercase text-sm">FlySmart</span>
            <span className="font-mono text-[var(--av-muted)] text-xs">To infinity and beyond</span>
            <img
              src="https://media1.tenor.com/m/2HE21xaOZI8AAAAd/toy-story-woody.gif"
              alt="Buzz and Woody flying"
              className="h-7 w-auto rounded"
              style={{ imageRendering: 'auto' }}
            />
          </div>
          <div className="flex items-center gap-3">
            {rateLimit && (
              <span
                className="font-mono text-xs px-2 py-1 rounded border text-[var(--av-muted)]"
                style={{ borderColor: 'var(--av-border)' }}
                title="Seats.aero API calls remaining today"
              >
                seats.aero: {rateLimit.remaining}/{rateLimit.limit}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {appState === 'idle' && (
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold mb-3 tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #00ffaa 0%, var(--av-accent) 40%, #a855f7 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
              Find Your Best Award Flight
            </h1>
            <p className="text-[var(--av-text-dim)] max-w-xl mx-auto text-sm leading-relaxed">
              Enter your route and points balances. Our AI travel expert will search for flights, evaluate every
              redemption option, and tell you exactly how to book the best deal.
            </p>
          </div>
        )}

        <div className="rounded-xl border p-6" style={{ background: 'var(--av-surface)', borderColor: 'var(--av-border)' }}>
          {appState !== 'idle' && (
            <div className="flex items-center gap-2 mb-5">
              <span className="font-mono text-xs text-[var(--av-muted)] uppercase tracking-widest">New Search</span>
            </div>
          )}
          <SearchForm onSearch={handleSearch} loading={isLoading} />
        </div>

        {isLoading && <FlightLoader message={status} />}

        {appState === 'error' && (
          <div className="mt-6 rounded-lg border p-4 space-y-1"
            style={{ borderColor: error.includes('rate limit') ? '#78350f' : '#450a0a', background: error.includes('rate limit') ? '#1c100220' : '#1a000020' }}>
            {error.includes('rate limit') ? (
              <>
                <p className="font-mono text-sm text-amber-400">⏱ Rate limit reached</p>
                <p className="font-mono text-xs text-amber-600">{error}</p>
              </>
            ) : (
              <>
                <p className="font-mono text-sm text-red-400">Error: {error}</p>
                <p className="font-mono text-xs text-red-600">Please try again. If this keeps happening, contact support.</p>
              </>
            )}
          </div>
        )}

        {appState === 'results' && results && (
          <ResultsPanel
            flights={results.flights}
            recommendation={results.recommendation}
            searchParams={results.searchParams}
            streaming={!!streamingRec && results.recommendation === streamingRec}
          />
        )}
      </main>

    </div>
  );
}
