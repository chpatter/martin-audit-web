/**
 * Active Directory Authentication Middleware
 *
 * Validates that the Windows user (passed via IIS Windows Authentication)
 * belongs to an allowed AD security group.
 *
 * Flow:
 *   1. IIS authenticates the user via Kerberos/NTLM (automatic, no login screen)
 *   2. IIS passes the verified username as X-IIS-WindowsAuthUser header to Node.js
 *   3. This middleware checks AD group membership
 *   4. Caches results so we're not hitting AD on every request
 *
 * Config (server/.env):
 *   AD_ENABLED=true
 *   AD_URL=ldap://your-domain-controller.martinsupply.local
 *   AD_BASE_DN=dc=martinsupply,dc=local
 *   AD_USERNAME=svc-audit-reader@martinsupply.local
 *   AD_PASSWORD=your-ad-service-account-password
 *   AD_ALLOWED_GROUPS=Martin-Audit-Users
 */

const ActiveDirectory = require('activedirectory2');

// ─── Cache ───
// Caches group membership checks so we don't query AD on every HTTP request.
// Cache entries expire after 15 minutes.
const membershipCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCachedMembership(username) {
  const entry = membershipCache.get(username.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    membershipCache.delete(username.toLowerCase());
    return null;
  }
  return entry.allowed;
}

function setCachedMembership(username, allowed) {
  membershipCache.set(username.toLowerCase(), { allowed, timestamp: Date.now() });
}

// ─── AD Client Setup ───

let ad = null;
let adEnabled = false;
let allowedGroups = [];

function initAD() {
  adEnabled = process.env.AD_ENABLED === 'true';

  if (!adEnabled) {
    console.log('[AD] Disabled — all users allowed (set AD_ENABLED=true to enforce)');
    return;
  }

  const url = process.env.AD_URL;
  const baseDN = process.env.AD_BASE_DN;
  const username = process.env.AD_USERNAME;
  const password = process.env.AD_PASSWORD;

  if (!url || !baseDN || !username || !password) {
    console.warn('[AD] Missing AD config — disabling AD auth. Need: AD_URL, AD_BASE_DN, AD_USERNAME, AD_PASSWORD');
    adEnabled = false;
    return;
  }

  allowedGroups = (process.env.AD_ALLOWED_GROUPS || '')
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);

  if (allowedGroups.length === 0) {
    console.warn('[AD] No AD_ALLOWED_GROUPS configured — all authenticated users allowed');
  }

  ad = new ActiveDirectory({
    url,
    baseDN,
    username,
    password,
  });

  console.log(`[AD] Enabled — checking groups: ${allowedGroups.join(', ') || '(any)'}`);
  console.log(`[AD] Domain controller: ${url}`);
}

// ─── Check Group Membership ───

function checkGroupMembership(username, groupName) {
  return new Promise((resolve, reject) => {
    ad.isUserMemberOf(username, groupName, (err, isMember) => {
      if (err) {
        console.error(`[AD] Error checking ${username} in ${groupName}:`, err.message);
        reject(err);
      } else {
        resolve(isMember);
      }
    });
  });
}

async function isUserAllowed(username) {
  if (!adEnabled) return true;
  if (allowedGroups.length === 0) return true;

  // Check cache first
  const cached = getCachedMembership(username);
  if (cached !== null) {
    return cached;
  }

  // Check each allowed group
  for (const group of allowedGroups) {
    try {
      const isMember = await checkGroupMembership(username, group);
      if (isMember) {
        console.log(`[AD] ${username} is member of ${group} — access granted`);
        setCachedMembership(username, true);
        return true;
      }
    } catch (err) {
      // Log but continue checking other groups
      console.warn(`[AD] Failed to check ${username} in ${group}: ${err.message}`);
    }
  }

  console.log(`[AD] ${username} is not in any allowed group — access denied`);
  setCachedMembership(username, false);
  return false;
}

// ─── Express Middleware ───

function adAuthMiddleware(req, res, next) {
  // Skip auth check for health endpoint
  if (req.path === '/api/health') return next();

  // IIS passes the authenticated Windows user via X-IIS-WindowsAuthUser header.
  // Format is typically DOMAIN\username — we extract just the username.
  const rawUser = req.headers['x-iis-windowsauthuser'] || req.headers['x-windows-user'] || '';
  const windowsUser = rawUser.includes('\\') ? rawUser.split('\\').pop() : rawUser;

  if (!adEnabled) {
    req.windowsUser = windowsUser || 'unknown';
    return next();
  }

  if (!windowsUser) {
    return res.status(401).json({
      message: 'Access denied. Windows Authentication required — ensure IIS has Windows Auth enabled.',
      code: 'NO_USER',
    });
  }

  isUserAllowed(windowsUser)
    .then(allowed => {
      if (allowed) {
        req.windowsUser = windowsUser;
        next();
      } else {
        res.status(403).json({
          message: `Access denied. ${windowsUser} is not in an authorized security group.`,
          code: 'NOT_IN_GROUP',
          user: windowsUser,
          requiredGroups: allowedGroups,
        });
      }
    })
    .catch(err => {
      console.error('[AD] Middleware error:', err.message);
      // On AD failure, deny access (fail closed)
      res.status(503).json({
        message: 'Unable to verify access. Active Directory may be unreachable.',
        code: 'AD_ERROR',
      });
    });
}

// ─── Clear Cache (for testing) ───

function clearCache() {
  membershipCache.clear();
}

module.exports = { initAD, adAuthMiddleware, clearCache };
