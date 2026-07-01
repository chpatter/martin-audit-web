/**
 * Shared formatting utilities used across all audit pages.
 */

// SXe server timezone — transdt/transtm values are stored in this timezone
const SERVER_TZ = 'America/Chicago';

/**
 * Format a transdt + transtm pair into a display string in the user's local timezone.
 * The raw values from Compass are in the SXe server's timezone (Central Time).
 * This function converts them to whatever timezone the user's browser is in.
 *
 * @param {string} dt - Date string like "2026-03-25"
 * @param {string|number} tm - Time as HHMM like "1430" or 1430
 * @returns {string} Formatted like "03/25/2026 2:30 PM" in the user's local timezone
 */
export function formatDateTime(dt, tm) {
  if (!dt) return '—';

  if (!tm) {
    const d = new Date(dt + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  const t = String(tm).padStart(4, '0');
  const hr = t.substring(0, 2);
  const min = t.substring(2, 4);

  // Parse as UTC, then find the offset for the server timezone
  const asUtc = new Date(`${dt}T${hr}:${min}:00Z`);
  const inServerTz = new Date(asUtc.toLocaleString('en-US', { timeZone: SERVER_TZ }));
  const offset = asUtc - inServerTz;
  // Shift to the real UTC moment that corresponds to this server-local time
  const corrected = new Date(asUtc.getTime() + offset);

  return corrected.toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
