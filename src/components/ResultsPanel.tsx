'use client';

import { useState } from 'react';
import type { FlightOffer } from '@/adapters/types';
import FlightCard from './FlightCard';
import WatchButton from './WatchButton';

interface Props {
  flights: FlightOffer[];
  recommendation: string;
  searchParams: {
    origin: string;
    destination: string;
    date: string;
    cabin: string;
  };
  streaming?: boolean;
}

interface ParsedRec {
  bestOption: string;
  steps: string[];
  analysis: string;
}

function parseRecommendation(text: string): ParsedRec {
  const section = (heading: string) => {
    const re = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    return text.match(re)?.[1]?.trim() ?? '';
  };

  const stepsRaw = section('HOW TO BOOK');
  const steps = stepsRaw
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l && !/^-{2,}$/.test(l));

  const clean = (s: string) => s.replace(/^-{2,}\s*$/gm, '').trim();

  return {
    bestOption: clean(section('BEST OPTION')),
    steps,
    analysis: clean(section('ANALYSIS')),
  };
}

function Bold({ text }: { text: string }) {
  // Strip markdown checkboxes [ ] and [x] then render **bold** and [label](url) links
  const cleaned = text.replace(/\[[ xX]\]\s*/g, '');
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={i} className="text-[var(--av-accent)]">{p.slice(2, -2)}</strong>;
        }
        const linkMatch = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
              className="text-[var(--av-accent)] underline underline-offset-2 hover:text-[var(--av-accent)]/80">
              {linkMatch[1]}
            </a>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function RecommendationPanel({ recommendation, streaming }: { recommendation: string; streaming?: boolean }) {
  const [tab, setTab] = useState<'summary' | 'analysis'>('summary');
  const rec = parseRecommendation(recommendation);
  const hasStructure = rec.bestOption || rec.steps.length > 0;

  // While streaming, show a skeleton until the structure is parseable
  if (!hasStructure) {
    if (streaming) {
      return (
        <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--av-surface)', borderColor: 'var(--av-border)' }}>
          <div className="px-5 pt-5 pb-4 border-b border-[var(--av-border)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[var(--av-accent)] animate-pulse" style={{ boxShadow: '0 0 8px var(--av-accent)' }} />
              <span className="font-mono text-xs text-[var(--av-accent)] uppercase tracking-widest">Best Option</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded animate-pulse w-4/5" style={{ background: 'var(--av-border)' }} />
              <div className="h-3 rounded animate-pulse w-2/3" style={{ background: 'var(--av-border)' }} />
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full flex-shrink-0 animate-pulse" style={{ background: 'var(--av-border)' }} />
                <div className="h-3 rounded animate-pulse flex-1" style={{ background: 'var(--av-border)', width: `${70 + i * 7}%` }} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    // Streaming done but Claude didn't follow format — show raw as fallback
    return (
      <div className="rounded-lg border p-5 text-sm text-[var(--av-text)]" style={{ background: 'var(--av-surface)', borderColor: 'var(--av-border)' }}>
        <p className="text-[var(--av-text-dim)]">{recommendation}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--av-surface)', borderColor: 'var(--av-border)' }}>
      {/* Best option header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--av-border)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[var(--av-accent)]" style={{ boxShadow: '0 0 8px var(--av-accent)' }} />
          <span className="font-mono text-xs text-[var(--av-accent)] uppercase tracking-widest">Best Option</span>
        </div>
        <p className="text-[var(--av-text)] text-sm leading-relaxed font-medium">
          <Bold text={rec.bestOption} />
          {streaming && !rec.steps.length && (
            <span className="inline-block w-1.5 h-4 bg-[var(--av-accent)] ml-0.5 animate-pulse align-middle" />
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--av-border)]">
        {(['summary', 'analysis'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              tab === t
                ? 'text-[var(--av-accent)] border-b-2 border-[var(--av-accent)] -mb-px'
                : 'text-[var(--av-muted)] hover:text-[var(--av-text-dim)]'
            }`}
          >
            {t === 'summary' ? 'How to Book' : 'Full Analysis'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-5 py-4">
        {tab === 'summary' && (
          <ol className="space-y-2.5">
            {rec.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-[var(--av-text)]">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                  style={{ background: 'var(--av-accent)18', color: 'var(--av-accent)', border: '1px solid var(--av-accent)40' }}
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">
                  <Bold text={step} />
                </span>
              </li>
            ))}
          </ol>
        )}

        {tab === 'analysis' && (
          <p className="text-sm text-[var(--av-text-dim)] leading-relaxed">
            <Bold text={rec.analysis || 'No additional analysis available.'} />
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResultsPanel({ flights, recommendation, searchParams, streaming }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Flights column */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-widest text-[var(--av-text-dim)]">
              Available Flights
            </h2>
            <p className="font-mono text-[var(--av-muted)] text-xs mt-0.5">
              {searchParams.origin} → {searchParams.destination} · {flights.length} result{flights.length !== 1 ? 's' : ''}
            </p>
          </div>
          <WatchButton
            origin={searchParams.origin}
            destination={searchParams.destination}
            date={searchParams.date}
            cabin={searchParams.cabin}
          />
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {flights.length === 0 ? (
            <div className="rounded-lg border border-[var(--av-border)] p-6 text-center">
              <p className="font-mono text-[var(--av-muted)] text-sm">No flights found for this route.</p>
              <p className="font-mono text-[var(--av-muted)] text-xs mt-1">Try different dates or a nearby airport.</p>
            </div>
          ) : (
            flights.slice(0, 8).map((f, i) => <FlightCard key={`${f.id}-${f.source ?? ''}-${i}`} flight={f} />)
          )}
        </div>
      </div>

      {/* Recommendation column */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-[var(--av-text-dim)] mb-4">
          AI Recommendation
        </h2>
        <RecommendationPanel recommendation={recommendation} streaming={streaming} />
      </div>
    </div>
  );
}
