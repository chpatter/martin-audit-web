/**
 * Active Directory Authentication & Role Middleware
 *
 * Validates that the Windows user (passed via IIS Windows Authentication)
 * belongs to at least one AD security group, and determines their role tier.
 *
 * Flow:
 *   1. IIS authenticates the user via Kerberos/NTLM (automatic, no login screen)
 *   2. IIS passes the verified username as X-IIS-WindowsAuthUser header to Node.js
 *   3. This middleware checks AD group membership across all role groups
 *   4. Assigns the highest matching role to the request
 *   5. Caches results for 15 minutes
 *
 * Roles (additive):
 *   USERS     → Operational fields, no Security module
 *   FINANCE   → + pricing, costs, margins, credit limits
 *   SENSITIVE → + bank accounts, tax IDs, 1099 info
 *   ADMIN     → + Security module, everything unmasked
 *
 * Config (server/.env):
 *   AD_ENABLED=true
 *   AD_URL=ldap://your-domain-controller
 *   AD_BASE_DN=DC=domain,DC=local
 *   AD_USERNAME=service-account@domain.local
 *   AD_PASSWORD=password
 *   AD_GROUP_USERS=Martin-Audit-Users
 *   AD_GROUP_FINANCE=Martin-Audit-Finance
 *   AD_GROUP_SENSITIVE=Martin-Audit-Sensitive
 *   AD_GROUP_ADMIN=Martin-Audit-Admin
 */

const ActiveDirectory = require('activedirectory2');
const { ROLES, getRoleGroupMapping, getRoleName } = require('./roles');

// ─── Cache ───
// Caches role lookups per user. Expires after 15 minutes.
const roleCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCachedRole(username) {
  const entry = roleCache.get(username.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    roleCache.delete(username.toLowerCase());
    return null;
  }
  return entry.role;
}

function setCachedRole(username, role) {
  roleCache.set(username.toLowerCase(), { role, timestamp: Date.now() });
}

// ─── AD Client Setup ───

let ad = null;
let adEnabled = false;
let roleGroupMap = {};

function initAD() {
  adEnabled = process.env.AD_ENABLED === 'true';

  if (!adEnabled) {
    console.log('[AD] Disabled — all users get ADMIN role (set AD_ENABLED=true to enforce)');
    return;
  }

  const url = process.env.AD_URL;
  const baseDN = process.env.AD_BASE_DN;
  const username = process.env.AD_USERNAME;
  const password = process.env.AD_PASSWORD;

  if (!url || !baseDN || !username || !password) {
    console.warn('[AD] Missing config — disabling. Need: AD_URL, AD_BASE_DN, AD_USERNAME, AD_PASSWORD');
    adEnabled = false;
    return;
  }

  roleGroupMap = getRoleGroupMapping();

  ad = new ActiveDirectory({ url, baseDN, username, password });

  console.log('[AD] Enabled — role groups:');
  for (const [group, role] of Object.entries(roleGroupMap)) {
    console.log('  ', getRoleName(role), '→', group);
  }
  console.log('[AD] Domain controller:', url);
}

// ─── Check Group Membership ───

function checkGroupMembership(username, groupName) {
  return new Promise((resolve, reject) => {
    ad.isUserMemberOf(username, groupName, (err, isMember) => {
      if (err) {
        console.error('[AD] Error checking group membership:', username, 'in', groupName, '-', err.message);
        reject(err);
      } else {
        resolve(isMember);
      }
    });
  });
}

// ─── Determine User's Role ───
// Checks all role groups and returns the highest role the user belongs to.
// Returns 0 if the user is in no groups (access denied).

async function getUserRole(username) {
  if (!adEnabled) return ROLES.ADMIN;

  // Check cache
  const cached = getCachedRole(username);
  if (cached !== null) return cached;

  let highestRole = 0;

  for (const [group, role] of Object.entries(roleGroupMap)) {
    try {
      const isMember = await checkGroupMembership(username, group);
      if (isMember && role > highestRole) {
        highestRole = role;
        console.log('[AD] Match:', username, 'is member of', group, '→', getRoleName(role));
      }
    } catch (err) {
      console.warn('[AD] Failed to check:', username, 'in', group, '-', err.message);
    }
  }

  if (highestRole > 0) {
    console.log('[AD] Role assigned:', username, '→', getRoleName(highestRole));
  } else {
    console.log('[AD] Access denied:', username, 'is not in any role group');
  }

  setCachedRole(username, highestRole);
  return highestRole;
}

// ─── NTLM Username Extraction ───
// When IIS proxies via ARR, the {LOGON_USER} variable is empty because
// rewrite runs before auth completes. But the Authorization: Negotiate header
// contains the NTLM Type 3 message with the username embedded.

function extractNtlmUsername(authHeader) {
  if (!authHeader) return '';
  try {
    // Strip "Negotiate " or "NTLM " prefix
    const token = authHeader.replace(/^(Negotiate|NTLM)\s+/i, '');
    const buf = Buffer.from(token, 'base64');

    // NTLM Type 3 message starts with "NTLMSSP\0" and has type 3 at offset 8
    if (buf.length < 32) return '';
    const sig = buf.toString('ascii', 0, 7);
    if (sig !== 'NTLMSSP') return '';
    const msgType = buf.readUInt32LE(8);
    if (msgType !== 3) return ''; // Only Type 3 has the username

    // Username is at: length at offset 36, offset at offset 40
    const userLen = buf.readUInt16LE(36);
    const userOffset = buf.readUInt32LE(40);

    if (userOffset + userLen > buf.length) return '';
    // Username is UTF-16LE encoded
    const username = buf.toString('utf16le', userOffset, userOffset + userLen);
    return username;
  } catch {
    return '';
  }
}

// ─── Express Middleware ───

function adAuthMiddleware(req, res, next) {
  // Skip auth for health endpoint
  if (req.path === '/api/health') return next();

  // Try multiple sources for the Windows username:
  // 1. IIS server variable header (works when rewrite runs after auth)
  // 2. NTLM token from Authorization header (fallback for ARR proxy)
  const rawUser = req.headers['x-iis-windowsauthuser']
    || req.headers['x-windows-user']
    || extractNtlmUsername(req.headers['authorization'])
    || '';
  const windowsUser = rawUser.includes('\\') ? rawUser.split('\\').pop() : rawUser;

  console.log('[AD] Identified user:', windowsUser || '(empty)');

  if (!adEnabled) {
    req.windowsUser = windowsUser || 'unknown';
    req.userRole = ROLES.ADMIN;
    req.userRoleName = 'ADMIN';
    return next();
  }

  if (!windowsUser) {
    return res.status(401).json({
      message: 'Access denied. Windows Authentication required — ensure IIS has Windows Auth enabled.',
      code: 'NO_USER',
    });
  }

  getUserRole(windowsUser)
    .then(role => {
      if (role > 0) {
        req.windowsUser = windowsUser;
        req.userRole = role;
        req.userRoleName = getRoleName(role);
        next();
      } else {
        const allGroups = Object.keys(roleGroupMap);
        res.status(403).json({
          message: 'Access denied. ' + windowsUser + ' is not in an authorized security group.',
          code: 'NOT_IN_GROUP',
          user: windowsUser,
          requiredGroups: allGroups,
        });
      }
    })
    .catch(err => {
      console.error('[AD] Middleware error:', err.message);
      res.status(503).json({
        message: 'Unable to verify access. Active Directory may be unreachable.',
        code: 'AD_ERROR',
      });
    });
}

// ─── Clear Cache ───
function clearCache() {
  roleCache.clear();
}

module.exports = { initAD, adAuthMiddleware, clearCache };
