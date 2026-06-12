import React, { useEffect, useRef } from 'react';
import { useTheme } from '../config/ThemeContext';
import PATCH_NOTES, { CURRENT_VERSION } from '../config/patchNotes';

// ─── Change type badges ───

const TYPE_COLORS = {
  added: { bg: '#065f46', text: '#34d399', label: 'Added' },
  changed: { bg: '#92400e', text: '#fbbf24', label: 'Changed' },
  fixed: { bg: '#1e3a5f', text: '#60a5fa', label: 'Fixed' },
  removed: { bg: '#7f1d1d', text: '#f87171', label: 'Removed' },
};

function TypeBadge({ type }) {
  const colors = TYPE_COLORS[type] || TYPE_COLORS.changed;
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
      padding: '2px 6px', borderRadius: 3, background: colors.bg, color: colors.text,
      textTransform: 'uppercase', flexShrink: 0, width: 60, textAlign: 'center',
    }}>
      {colors.label}
    </span>
  );
}

// ─── "New" badge logic ───

const STORAGE_KEY = 'martin-audit-last-seen-version';

export function hasNewPatchNotes() {
  try {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    return lastSeen !== CURRENT_VERSION;
  } catch {
    return false;
  }
}

export function markPatchNotesSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  } catch {}
}

// ─── Modal Component ───

export default function PatchNotesModal({ onClose }) {
  const { theme } = useTheme();
  const contentRef = useRef(null);
  const versionRefs = useRef({});

  // Mark as seen when modal opens
  useEffect(() => {
    markPatchNotesSeen();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function scrollToVersion(version) {
    const el = versionRefs.current[version];
    if (el && contentRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', width: '90%', maxWidth: 820, height: '75vh',
          background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.lg, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Sidebar — version legend */}
        <div style={{
          width: 180, flexShrink: 0, borderRight: `1px solid ${theme.colors.border}`,
          padding: '20px 0', overflowY: 'auto', background: theme.colors.bg,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: theme.colors.textMuted,
            padding: '0 16px 12px', textTransform: 'uppercase',
          }}>
            Versions
          </div>
          {PATCH_NOTES.map((release) => (
            <button
              key={release.version}
              onClick={() => scrollToVersion(release.version)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px', background: 'transparent', border: 'none',
                color: theme.colors.text, cursor: 'pointer', fontFamily: theme.fonts.body,
                fontSize: 12, borderLeft: '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.colors.bgInput;
                e.currentTarget.style.borderLeftColor = theme.colors.accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderLeftColor = 'transparent';
              }}
            >
              <div style={{ fontWeight: 700, fontFamily: theme.fonts.mono, color: theme.colors.accent }}>
                v{release.version}
              </div>
              <div style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 2 }}>
                {release.date}
              </div>
            </button>
          ))}
        </div>

        {/* Content — scrollable patch notes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 24px', borderBottom: `1px solid ${theme.colors.border}`,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.colors.textBright }}>
                Patch Notes
              </h2>
              <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                Current version: v{CURRENT_VERSION}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.sm, color: theme.colors.textMuted,
                padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: theme.fonts.body,
              }}
            >
              Close
            </button>
          </div>

          {/* Scrollable content */}
          <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {PATCH_NOTES.map((release, idx) => (
              <div
                key={release.version}
                ref={el => versionRefs.current[release.version] = el}
                style={{ marginBottom: idx < PATCH_NOTES.length - 1 ? 32 : 0 }}
              >
                {/* Version header */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 18, fontWeight: 800, fontFamily: theme.fonts.mono,
                    color: theme.colors.accent,
                  }}>
                    v{release.version}
                  </span>
                  <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
                    {release.date}
                  </span>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: theme.colors.textBright, marginBottom: 12,
                }}>
                  {release.title}
                </div>

                {/* Changes list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {release.changes.map((change, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <TypeBadge type={change.type} />
                      <span style={{ fontSize: 12, color: theme.colors.text, lineHeight: 1.5 }}>
                        {change.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Divider between versions */}
                {idx < PATCH_NOTES.length - 1 && (
                  <div style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                    marginTop: 24,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
