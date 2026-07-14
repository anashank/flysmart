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

function FlightLoader({ message }: { message: string }) {
  return (
    <div className="mt-8 rounded-xl border border-[var(--av-border)] overflow-hidden" style={{ background: 'var(--av-bg)' }}>
      <div className="relative h-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'planeBob 3s ease-in-out infinite', zIndex: 10 }}>
          <span style={{ fontSize: 36, lineHeight: 1, display: 'block', color: 'var(--av-accent)' }}>✈</span>
        </div>
      </div>
      <div className="border-t border-[var(--av-border)] px-5 py-3 flex items-center gap-2.5">
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--av-accent)] opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--av-accent)]" />
        </span>
        <span className="font-mono text-xs text-[var(--av-text-dim)] tracking-wide">{message}</span>
      </div>
      <style>{`
        @keyframes planeBob {
          0%, 100% { transform: translate(-50%, -50%) rotate(1deg); }
          50%       { transform: translate(-50%, calc(-50% - 6px)) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}

export default function DemoPage() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [streamingRec, setStreamingRec] = useState('');
  const [error, setError] = useState('');

  async function handleSearch(values: SearchFormValues) {
    setAppState('streaming');
    setStatus('Connecting...');
    setStreamingRec('');
    setResults(null);
    setError('');

    const accFlights: FlightOffer[] = [];
    let accRec = '';

    try {
      const res = await fetch('/api/demo-agent', {
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
          setAppState((s) => {
            if (s === 'streaming') {
              if (accFlights.length > 0 || accRec) {
                setResults({ flights: accFlights, recommendation: accRec, searchParams: values });
                return 'results';
              }
              setError('No results found. Try a different search.');
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
            setAppState('results');
            setResults({ flights: accFlights, recommendation: accRec, searchParams: values });
          } else if (event.type === 'done') {
            setResults({ flights: accFlights, recommendation: event.recommendation, searchParams: values });
            setAppState('results');
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
      <div className="aurora">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>

      <header className="relative z-10 border-b px-6 py-4"
        style={{ backdropFilter: 'blur(12px)', background: 'var(--av-header)', borderColor: 'var(--av-border)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[var(--av-accent)] text-xl">✈</span>
            <span className="font-mono font-bold text-[var(--av-text)] tracking-widest uppercase text-sm">FlySmart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-3 py-1 rounded-full border text-[var(--av-gold)]"
              style={{ borderColor: 'var(--av-gold)', background: 'transparent', opacity: 0.8 }}>
              Demo Mode
            </span>
            <span className="font-mono text-xs px-3 py-1 rounded-full border border-[#a855f740] text-[#a855f7]"
              style={{ background: '#a855f710' }}>
              Powered by Llama
            </span>
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
              FlySmart Demo
            </h1>
            <p className="text-[var(--av-text-dim)] max-w-xl mx-auto text-sm leading-relaxed mb-3">
              Try a live demo of the AI agentic loop — search any route and watch the agent
              autonomously search flights, evaluate redemptions, and stream a recommendation in real time.
            </p>
            <p className="font-mono text-xs text-[var(--av-muted)]">
              ✦ Uses sample flight data · No login required · Real AI reasoning
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
          <div className="mt-6 rounded-lg border border-red-900/40 bg-red-950/20 p-4">
            <p className="font-mono text-sm text-red-400">Error: {error}</p>
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
