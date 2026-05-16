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
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="text-[#00d4ff]">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
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
        <div className="rounded-lg border overflow-hidden" style={{ background: '#0f1829', borderColor: '#1a2d4a' }}>
          <div className="px-5 pt-5 pb-4 border-b border-[#1a2d4a]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" style={{ boxShadow: '0 0 8px #00d4ff' }} />
              <span className="font-mono text-xs text-[#00d4ff] uppercase tracking-widest">Best Option</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded animate-pulse w-4/5" style={{ background: '#1a2d4a' }} />
              <div className="h-3 rounded animate-pulse w-2/3" style={{ background: '#1a2d4a' }} />
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#1a2d4a' }} />
                <div className="h-3 rounded animate-pulse flex-1" style={{ background: '#1a2d4a', width: `${70 + i * 7}%` }} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    // Streaming done but Claude didn't follow format — show raw as fallback
    return (
      <div className="rounded-lg border p-5 text-sm text-[#e2eaf5]" style={{ background: '#0f1829', borderColor: '#1a2d4a' }}>
        <p className="text-[#7a9ab8]">{recommendation}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ background: '#0f1829', borderColor: '#1a2d4a' }}>
      {/* Best option header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1a2d4a]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#00d4ff]" style={{ boxShadow: '0 0 8px #00d4ff' }} />
          <span className="font-mono text-xs text-[#00d4ff] uppercase tracking-widest">Best Option</span>
        </div>
        <p className="text-[#e2eaf5] text-sm leading-relaxed font-medium">
          <Bold text={rec.bestOption} />
          {streaming && !rec.steps.length && (
            <span className="inline-block w-1.5 h-4 bg-[#00d4ff] ml-0.5 animate-pulse align-middle" />
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a2d4a]">
        {(['summary', 'analysis'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              tab === t
                ? 'text-[#00d4ff] border-b-2 border-[#00d4ff] -mb-px'
                : 'text-[#4a6280] hover:text-[#7a9ab8]'
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
              <li key={i} className="flex gap-3 text-sm text-[#e2eaf5]">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                  style={{ background: '#00d4ff18', color: '#00d4ff', border: '1px solid #00d4ff40' }}
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
          <p className="text-sm text-[#7a9ab8] leading-relaxed">
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
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#7a9ab8]">
              Available Flights
            </h2>
            <p className="font-mono text-[#4a6280] text-xs mt-0.5">
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
            <div className="rounded-lg border border-[#1a2d4a] p-6 text-center">
              <p className="font-mono text-[#4a6280] text-sm">No flights found for this route.</p>
              <p className="font-mono text-[#4a6280] text-xs mt-1">Try different dates or a nearby airport.</p>
            </div>
          ) : (
            flights.slice(0, 8).map((f, i) => <FlightCard key={`${f.id}-${f.source ?? ''}-${i}`} flight={f} />)
          )}
        </div>
      </div>

      {/* Recommendation column */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-[#7a9ab8] mb-4">
          AI Recommendation
        </h2>
        <RecommendationPanel recommendation={recommendation} streaming={streaming} />
      </div>
    </div>
  );
}
