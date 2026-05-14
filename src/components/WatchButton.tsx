'use client';

import { useState } from 'react';

interface Props {
  origin: string;
  destination: string;
  date: string;
  cabin: string;
}

type State = 'idle' | 'input' | 'loading' | 'success' | 'error';

export default function WatchButton({ origin, destination, date, cabin }: Props) {
  const [state, setState] = useState<State>('idle');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleWatch() {
    if (!email) return;
    setState('loading');
    try {
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, origin, destination, date, cabin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setMessage(data.message);
      setState('success');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10">
        <span className="text-[#22c55e] text-sm">✓</span>
        <span className="font-mono text-xs text-[#22c55e]">{message}</span>
      </div>
    );
  }

  if (state === 'input' || state === 'loading' || state === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-[#0a1526] border border-[#1a2d4a] rounded-lg px-3 py-2 text-sm text-[#e2eaf5] placeholder-[#4a6280] focus:outline-none focus:border-[#00d4ff] font-mono"
          />
          <button
            onClick={handleWatch}
            disabled={state === 'loading' || !email}
            className="px-4 py-2 rounded-lg border border-[#00d4ff]/40 text-[#00d4ff] font-mono text-xs uppercase tracking-widest hover:bg-[#00d4ff]/10 transition-colors disabled:opacity-50"
          >
            {state === 'loading' ? '...' : 'Watch'}
          </button>
        </div>
        {state === 'error' && (
          <p className="font-mono text-xs text-red-400">{message}</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('input')}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1a2d4a] text-[#7a9ab8] hover:border-[#00d4ff]/40 hover:text-[#00d4ff] transition-colors font-mono text-xs uppercase tracking-widest"
    >
      <span>◉</span>
      <span>Watch this route</span>
    </button>
  );
}
