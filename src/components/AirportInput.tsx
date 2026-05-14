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

  const labelClass = 'block text-xs text-[#7a9ab8] uppercase tracking-widest mb-1.5 font-mono';

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>{label}</label>
      <input
        ref={inputRef}
        className="w-full bg-[#0a1526] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf5] placeholder-[#4a6280] focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 hover:border-[#00d4ff]/50 hover:bg-[#0d1e35] transition-colors font-mono text-sm tracking-wider"
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
          className="absolute z-50 w-full mt-1 rounded-lg border border-[#1a2d4a] overflow-hidden shadow-xl"
          style={{ background: '#0d1e35' }}
        >
          {results.map((airport, i) => (
            <button
              key={airport.code}
              type="button"
              onMouseDown={() => select(airport)}
              onMouseEnter={() => setHighlighted(i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: i === highlighted ? '#1a2d4a' : 'transparent' }}
            >
              <span
                className="font-mono text-sm font-bold flex-shrink-0 w-10"
                style={{ color: '#00d4ff' }}
              >
                {airport.code}
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-[#e2eaf5] text-xs truncate">{airport.city}</span>
                <span className="text-[#4a6280] text-xs truncate">{airport.name}</span>
              </span>
              <span className="ml-auto text-[#4a6280] text-xs flex-shrink-0">{airport.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
