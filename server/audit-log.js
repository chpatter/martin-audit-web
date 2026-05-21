/**
 * Audit Logger
 *
 * Writes a JSON-lines log file recording every search query.
 * Each line is a JSON object with: who, what, when, results count.
 *
 * Log files rotate daily: audit-2026-05-19.log, audit-2026-05-20.log, etc.
 * Stored in server/logs/ directory.
 *
 * This is for compliance — "who looked at what and when."
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFile() {
  const date = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `audit-${date}.log`);
}

/**
 * Log an audit event.
 *
 * @param {object} entry
 * @param {string} entry.user - Windows username
 * @param {string} entry.role - User's role tier
 * @param {string} entry.action - What they did (search, export, view)
 * @param {object} entry.details - Search filters, module, etc.
 * @param {number} entry.resultCount - Number of results returned
 */
function logAudit({ user, role, action, details, resultCount }) {
  const entry = {
    timestamp: new Date().toISOString(),
    user: user || 'unknown',
    role: role || 'unknown',
    action: action || 'unknown',
    details: details || {},
    resultCount: resultCount || 0,
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    fs.appendFileSync(getLogFile(), line, 'utf-8');
  } catch (err) {
    console.error('[AUDIT] Failed to write log:', err.message);
  }
}

/**
 * Express middleware — logs every API request with the authenticated user.
 * Attach after auth middleware so req.windowsUser is available.
 */
function auditMiddleware(req, res, next) {
  // Skip health checks and static assets
  if (req.path === '/api/health') return next();

  // Capture the original res.json to intercept response data
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    // Log searches with details
    if (req.path === '/api/changes/search' && req.method === 'POST') {
      const filters = req.body || {};
      logAudit({
        user: req.windowsUser,
        role: req.userRoleName,
        action: 'search',
        details: {
          tables: filters.tables || filters.source || 'default',
          pono: filters.pono || null,
          custno: filters.custno || null,
          vendno: filters.vendno || null,
          prod: filters.prod || null,
          whse: filters.whse || null,
          fromDate: filters.fromDate || null,
          toDate: filters.toDate || null,
        },
        resultCount: data?.count || 0,
      });
    }

    // Log PO lookups
    if (req.path.startsWith('/api/changes/po/')) {
      logAudit({
        user: req.windowsUser,
        role: req.userRoleName,
        action: 'po_lookup',
        details: { pono: req.params.pono, posuf: req.query.posuf },
        resultCount: data?.count || 0,
      });
    }

    // Log recent changes
    if (req.path === '/api/changes/recent') {
      logAudit({
        user: req.windowsUser,
        role: req.userRoleName,
        action: 'recent',
        details: { days: req.query.days, whse: req.query.whse },
        resultCount: data?.count || 0,
      });
    }

    // Log auth status checks (first access / role check)
    if (req.path === '/api/auth/status') {
      logAudit({
        user: req.windowsUser,
        role: req.userRoleName,
        action: 'access',
        details: {},
        resultCount: 0,
      });
    }

    return originalJson(data);
  };

  next();
}

module.exports = { logAudit, auditMiddleware };
