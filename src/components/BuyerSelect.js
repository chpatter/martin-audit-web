import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../config/ThemeContext';

/**
 * Searchable operator dropdown.
 * Fetches the operator list once from /api/buyers and caches it.
 * User can type to filter by code or name, or pick from the dropdown.
 */

let cachedBuyers = null;

export default function BuyerSelect({ value, onChange, onSearch }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [operators, setOperators] = useState(cachedBuyers || []);
  const [search, setSearch] = useState(value || '');
  const ref = useRef(null);

  // Sync external value changes
  useEffect(() => { setSearch(value || ''); }, [value]);

  // Load operators once
  useEffect(() => {
    if (cachedBuyers) return;
    fetch('/api/buyers', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        cachedBuyers = data;
        setOperators(data);
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = operators.filter(op => {
    const q = search.toLowerCase();
    return !q || op.code.toLowerCase().includes(q) || op.name.toLowerCase().includes(q);
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        placeholder="e.g. KP01"
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter') { setOpen(false); onSearch(); }
          if (e.key === 'Escape') setOpen(false);
        }}
        style={{
          padding: '10px 14px', background: theme.colors.bgInput,
          border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md,
          color: theme.colors.text, fontSize: 12, outline: 'none', width: '100%',
          fontFamily: theme.fonts.mono,
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          maxHeight: 220, overflowY: 'auto',
          background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md, marginTop: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {filtered.slice(0, 50).map(op => (
            <div
              key={op.code}
              onClick={() => {
                setSearch(op.code);
                onChange(op.code);
                setOpen(false);
              }}
              style={{
                padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                color: theme.colors.text, fontFamily: theme.fonts.mono,
                borderBottom: `1px solid ${theme.colors.border}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.colors.bgInput}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: theme.colors.accent, fontWeight: 600 }}>{op.code}</span>
              {op.name && <span style={{ color: theme.colors.textMuted, marginLeft: 8 }}>{op.name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
