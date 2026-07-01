import React, { useState } from 'react';
import { useTheme } from '../config/ThemeContext';

/**
 * Small "i" icon that shows a tooltip on hover.
 * Place next to a label: <div>Field Name <InfoTip text="explanation" /></div>
 */
export default function InfoTip({ text }) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);

  if (!text) return null;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 13, height: 13, borderRadius: '50%',
        border: `1px solid ${theme.colors.textMuted}`,
        color: theme.colors.textMuted, fontSize: 8, fontWeight: 700,
        fontStyle: 'italic', fontFamily: 'Georgia, serif',
        lineHeight: 1, userSelect: 'none', textTransform: 'none',
      }}>
        i
      </span>
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, padding: '8px 12px',
          background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          color: theme.colors.text, fontSize: 11, lineHeight: 1.5,
          whiteSpace: 'normal', width: 220, zIndex: 200,
          fontWeight: 400, fontStyle: 'normal', textTransform: 'none',
          letterSpacing: 'normal',
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: `5px solid ${theme.colors.border}`,
          }} />
        </div>
      )}
    </span>
  );
}
