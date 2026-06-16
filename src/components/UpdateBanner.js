import React, { useState, useEffect } from 'react';
import { CURRENT_VERSION } from '../config/patchNotes';

/**
 * UpdateBanner
 *
 * Polls /api/version every 5 minutes. If the server version is newer
 * than what's loaded in the browser, shows a banner telling the user
 * to refresh. Clicking the banner reloads the page.
 */

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function UpdateBanner() {
  const [newVersion, setNewVersion] = useState(null);

  useEffect(() => {
    let timer;

    async function checkVersion() {
      try {
        const res = await fetch('/api/version', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== CURRENT_VERSION) {
          setNewVersion(data.version);
        }
      } catch {
        // Silently ignore — don't bother users if the check fails
      }
    }

    // First check after 30 seconds (let the app load first)
    const initialDelay = setTimeout(() => {
      checkVersion();
      timer = setInterval(checkVersion, POLL_INTERVAL);
    }, 30 * 1000);

    return () => {
      clearTimeout(initialDelay);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!newVersion) return null;

  return (
    <div
      onClick={() => window.location.reload()}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
        background: 'linear-gradient(90deg, #1e40af, #3b82f6)',
        color: '#fff', padding: '10px 24px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        cursor: 'pointer', fontSize: 13, fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <span>A new version (v{newVersion}) is available.</span>
      <span style={{
        background: 'rgba(255,255,255,0.2)', padding: '3px 12px',
        borderRadius: 4, fontSize: 11, fontWeight: 700,
      }}>
        Click to refresh
      </span>
    </div>
  );
}
