'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PROGRAM_META, CURRENCY_LABELS, type PointsCurrency } from '@/data/programs';

interface Props {
  values: Partial<Record<PointsCurrency, number>>;
  onChange: (values: Partial<Record<PointsCurrency, number>>) => void;
}

const ALL_CURRENCIES = Object.keys(PROGRAM_META) as PointsCurrency[];
const CARDS   = ALL_CURRENCIES.filter((c) => PROGRAM_META[c].category === 'card');
const AIRLINES = ALL_CURRENCIES.filter((c) => PROGRAM_META[c].category === 'airline');
const DROPDOWN_MAX_H = 320;

function ProgramBadge({ currency, size = 28 }: { currency: PointsCurrency; size?: number }) {
  const meta = PROGRAM_META[currency];
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center rounded-md overflow-hidden font-bold"
      style={{ width: size, height: size, background: meta.bg, fontSize: size * 0.32, color: meta.color }}
    >
      {meta.logoUrl && !imgFailed ? (
        <img
          src={meta.logoUrl}
          alt={meta.label}
          width={size}
          height={size}
          style={{ objectFit: 'contain', padding: 3 }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        meta.initials
      )}
    </span>
  );
}

function Group({ title, currencies, selected, onToggle }: {
  title: string;
  currencies: PointsCurrency[];
  selected: Set<PointsCurrency>;
  onToggle: (c: PointsCurrency) => void;
}) {
  return (
    <div>
      <p className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-[var(--av-muted)]">{title}</p>
      {currencies.map((c) => {
        const isSelected = selected.has(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onToggle(c)}
            className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left"
            style={{ background: isSelected ? 'var(--av-border)' : 'transparent' }}
            onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--av-input-hover)'; }}
            onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <ProgramBadge currency={c} size={26} />
            <span className="text-sm text-[var(--av-text)] flex-1">{CURRENCY_LABELS[c]}</span>
            {isSelected && <span className="text-[var(--av-accent)] text-xs">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function ProgramSelector({ values, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<PointsCurrency>>(
    new Set(Object.keys(values) as PointsCurrency[])
  );
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown relative to trigger, flipping up if not enough space below
  const positionDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < DROPDOWN_MAX_H && spaceAbove > spaceBelow;
    const maxH = Math.min(DROPDOWN_MAX_H, openUp ? spaceAbove : spaceBelow);

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: maxH,
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    positionDropdown();
    window.addEventListener('scroll', positionDropdown, true);
    window.addEventListener('resize', positionDropdown);
    return () => {
      window.removeEventListener('scroll', positionDropdown, true);
      window.removeEventListener('resize', positionDropdown);
    };
  }, [open, positionDropdown]);

  // Close on outside click — must exclude both trigger AND portal dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle(currency: PointsCurrency) {
    const next = new Set(selected);
    if (next.has(currency)) {
      next.delete(currency);
      const updated = { ...values };
      delete updated[currency];
      onChange(updated);
    } else {
      next.add(currency);
    }
    setSelected(next);
  }

  function setBalance(currency: PointsCurrency, raw: string) {
    const num = parseInt(raw.replace(/,/g, ''), 10);
    onChange({ ...values, [currency]: isNaN(num) ? undefined : num });
  }

  const selectedList = Array.from(selected);
  const labelClass = 'block text-xs text-[var(--av-text-dim)] uppercase tracking-widest mb-1.5 font-mono';

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="rounded-lg border border-[var(--av-border)] overflow-y-auto shadow-md"
      style={{ ...dropdownStyle, background: 'var(--av-dropdown)' }}
    >
      <Group title="Credit Cards"   currencies={CARDS}    selected={selected} onToggle={toggle} />
      <div className="border-t border-[var(--av-border)] my-1" />
      <Group title="Frequent Flyer" currencies={AIRLINES} selected={selected} onToggle={toggle} />
    </div>,
    document.body
  ) : null;

  return (
    <div className="space-y-3">
      <label className={labelClass}>Your Points & Miles</label>

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left"
        style={{ background: 'var(--av-input)', borderColor: open ? 'var(--av-accent)' : 'var(--av-border)' }}
      >
        <span className="flex items-center gap-2 flex-wrap min-w-0">
          {selectedList.length === 0 ? (
            <span className="text-sm text-[var(--av-muted)] font-mono">Select programs...</span>
          ) : (
            <>
              {selectedList.slice(0, 6).map((c) => (
                <ProgramBadge key={c} currency={c} size={22} />
              ))}
              {selectedList.length > 6 && (
                <span className="text-xs text-[var(--av-muted)] font-mono">+{selectedList.length - 6}</span>
              )}
            </>
          )}
        </span>
        <span className="text-[var(--av-muted)] ml-2 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {dropdown}

      {/* Balance inputs */}
      {selectedList.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {selectedList.map((c) => (
            <div
              key={c}
              className="flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors hover:border-[var(--av-accent)]/50"
              style={{ background: 'var(--av-input)', borderColor: 'var(--av-border)' }}
            >
              <ProgramBadge currency={c} size={22} />
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="flex-1 bg-transparent text-[var(--av-text)] placeholder-[var(--av-muted)] focus:outline-none font-mono text-sm min-w-0"
                value={values[c]?.toLocaleString() ?? ''}
                onChange={(e) => setBalance(c, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
