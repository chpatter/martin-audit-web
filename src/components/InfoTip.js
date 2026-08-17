import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../config/ThemeContext';
import ReactDOM from 'react-dom';

/**
 * Small "i" icon that shows a tooltip on hover.
 * position="top" (default) renders above the icon.
 * position="right" uses a portal to render at fixed screen position — avoids overflow clipping.
 */
export default function InfoTip({ text, position = 'top' }) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const iconRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && position === 'right' && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({ top: rect.top - 4, left: rect.right + 8 });
    }
  }, [show, position]);

  if (!text) return null;

  const iconStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 13, height: 13, borderRadius: '50%',
    border: `1px solid ${theme.colors.textMuted}`,
    color: theme.colors.textMuted, fontSize: 8, fontWeight: 700,
    fontStyle: 'italic', fontFamily: 'Georgia, serif',
    lineHeight: 1, userSelect: 'none', textTransform: 'none',
  };

  const tooltipStyle = {
    padding: '8px 12px',
    background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii.md, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    color: theme.colors.text, fontSize: 11, lineHeight: 1.5,
    whiteSpace: 'normal', width: 220, zIndex: 10000,
    fontWeight: 400, fontStyle: 'normal', textTransform: 'none',
    letterSpacing: 'normal',
  };

  // Portal-based tooltip for sidebar (avoids overflow clipping)
  if (position === 'right') {
    return (
      <span
        ref={iconRef}
        style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, cursor: 'help' }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <span style={iconStyle}>i</span>
        {show && ReactDOM.createPortal(
          <div style={{
            ...tooltipStyle,
            position: 'fixed',
            top: coords.top,
            left: coords.left,
          }}>
            {text}
          </div>,
          document.body
        )}
      </span>
    );
  }

  // Default top-positioned tooltip
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={iconStyle}>i</span>
      {show && (
        <div style={{
          ...tooltipStyle,
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6,
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
