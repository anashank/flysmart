'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setTheme('light');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-full border transition-colors"
      style={{
        borderColor: 'var(--av-border)',
        background: 'var(--av-surface)',
        color: 'var(--av-text-dim)',
      }}
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
