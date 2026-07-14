'use client';

import { useState, useRef, useEffect } from 'react';
import { searchAirports, type Airport } from '@/data/airports';

interface Props {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

export default function AirportInput({ label, value, onChange, placeholder = 'JFK' }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep query in sync when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    // If it looks like a raw IATA code, pass it through directly
    if (/^[A-Z]{3}$/.test(val)) {
      onChange(val);
    } else {
      onChange('');
    }
    const found = searchAirports(val);
    setResults(found);
    setOpen(found.length > 0);
    setHighlighted(0);
  }

  function select(airport: Airport) {
    setQuery(`${airport.code} — ${airport.city}`);
    onChange(airport.code);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (results[highlighted]) select(results[highlighted]); }
    if (e.key === 'Escape')    { setOpen(false); }
  }

  const labelClass = 'block text-xs text-[var(--av-text-dim)] uppercase tracking-widest mb-1.5 font-mono';

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>{label}</label>
      <input
        ref={inputRef}
        className="w-full bg-[var(--av-input)] border border-[var(--av-border)] rounded-lg px-4 py-3 text-[var(--av-text)] placeholder-[var(--av-muted)] focus:outline-none focus:border-[var(--av-accent)] focus:ring-1 focus:ring-[var(--av-accent)]/30 hover:border-[var(--av-accent)]/50 hover:bg-[var(--av-input-hover)] transition-colors font-mono text-sm tracking-wider"
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        autoComplete="off"
        required
      />

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border border-[var(--av-border)] overflow-hidden shadow-xl"
          style={{ background: 'var(--av-input-hover)' }}
        >
          {results.map((airport, i) => (
            <button
              key={airport.code}
              type="button"
              onMouseDown={() => select(airport)}
              onMouseEnter={() => setHighlighted(i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: i === highlighted ? 'var(--av-border)' : 'transparent' }}
            >
              <span
                className="font-mono text-sm font-bold flex-shrink-0 w-10"
                style={{ color: 'var(--av-accent)' }}
              >
                {airport.code}
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-[var(--av-text)] text-xs truncate">{airport.city}</span>
                <span className="text-[var(--av-muted)] text-xs truncate">{airport.name}</span>
              </span>
              <span className="ml-auto text-[var(--av-muted)] text-xs flex-shrink-0">{airport.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
