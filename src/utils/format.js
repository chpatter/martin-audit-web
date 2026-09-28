/**
 * Shared formatting utilities used across all audit pages.
 */

/**
 * Format a transdt + transtm pair into a display string in the user's LOCAL timezone.
 *
 * The raw values from Compass (transdt/transtm) are stored in UTC. We build the true
 * UTC instant from them, then let the browser render it in whatever timezone the
 * viewer is in. This means two users in different zones see the same moment expressed
 * in their own local time (e.g. 3:48 PM Central == 4:48 PM Eastern). DST is handled
 * automatically because we format a real UTC instant.
 *
 * @param {string} dt - Date string like "2026-03-25"
 * @param {string|number} tm - Time as HHMM like "1430" or 1430
 * @returns {string} Formatted like "03/25/2026 2:30 PM" in the user's local timezone
 */
export function formatDateTime(dt, tm) {
  if (!dt) return '—';

  // Date only — no time component. Render the calendar date as-is with no tz shift,
  // so a plain date can't roll back a day for viewers behind UTC.
  if (!tm) {
    const d = new Date(dt + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  const t = String(tm).padStart(4, '0');
  const hr = t.substring(0, 2);
  const min = t.substring(2, 4);

  // Raw transdt/transtm are UTC -> this is the true instant.
  const instant = new Date(`${dt}T${hr}:${min}:00Z`);

  // No timeZone option => rendered in the viewer's own local timezone.
  return instant.toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
