/**
 * Active Directory Authentication & Role Middleware
 *
 * With iisnode, IIS handles Windows Auth (Kerberos + NTLM) and passes
 * the verified username directly to Node.js via the x-iisnode-auth_user header.
 * No token parsing needed — IIS does all the heavy lifting.
 *
 * This middleware checks AD group membership to determine the user's role tier.
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

async function getUserRole(username) {
  if (!adEnabled) return ROLES.ADMIN;

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

// ─── Express Middleware ───

function adAuthMiddleware(req, res, next) {
  // Skip auth for health endpoint
  if (req.path === '/api/health') return next();

  // iisnode promotes AUTH_USER to x-iisnode-auth_user header
  // Format is DOMAIN\username — extract just the username
  const rawUser = req.headers['x-iisnode-auth_user'] || '';
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
      message: 'Access denied. Windows Authentication required.',
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
