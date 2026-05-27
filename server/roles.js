/**
 * Role-Based Access Control (RBAC)
 *
 * Four roles, additive tiers — each includes everything below it.
 *
 *   USERS      → All modules except Security. Operational fields only.
 *   FINANCE    → + pricing, costs, margins, credit limits, discounts, rebates
 *   SENSITIVE  → + bank accounts, routing numbers, tax IDs, 1099 info
 *   ADMIN      → + Security module. Everything unmasked.
 *
 * Masking is server-side — masked field values are replaced with '●●●●●●'
 * before the response is sent. Masked data never reaches the browser.
 */

// ─── Role Hierarchy ───
// Higher number = more access. Used for comparison.
const ROLES = {
  USERS: 1,
  FINANCE: 2,
  SENSITIVE: 3,
  ADMIN: 4,
};

// ─── AD Group → Role Mapping ───
// The user gets the highest role from all groups they belong to.
// Configure group names in server/.env via AD_GROUP_USERS, AD_GROUP_FINANCE, etc.
function getRoleGroupMapping() {
  return {
    [process.env.AD_GROUP_USERS || 'Martin-Audit-Users']: ROLES.USERS,
    [process.env.AD_GROUP_FINANCE || 'Martin-Audit-Finance']: ROLES.FINANCE,
    [process.env.AD_GROUP_SENSITIVE || 'Martin-Audit-Sensitive']: ROLES.SENSITIVE,
    [process.env.AD_GROUP_ADMIN || 'Martin-Audit-Admin']: ROLES.ADMIN,
  };
}

// ─── Modules Visible Per Role ───
// Security module is admin-only.
const SECURITY_TABLES = ['sasoo', 'pv_user', 'pv_secure', 'authsecure'];

function canAccessTable(role, table) {
  if (SECURITY_TABLES.includes(table.toLowerCase())) {
    return role >= ROLES.ADMIN;
  }
  return true;
}

// ─── Masked Fields Per Tier ───
// Fields listed here are masked for any role BELOW the specified minimum tier.

// Tier 2 (FINANCE) — pricing, costs, margins, credit limits
const FINANCE_FIELDS = {
  // Catalog (ICSC)
  icsc: ['baseprice', 'listprice', 'prodcost', 'stndcost', 'rebatecost', 'pricetype', 'priceonty', 'costmult', 'costtype'],
  // Order Lines (OEEL)
  oeel: ['price', 'netamt', 'netord', 'custcost', 'discamt', 'discpct', 'disctype', 'commcost', 'priceoverfl', 'pricetype', 'specprcty'],
  // Order Headers (OEEH)
  oeeh: ['totcost', 'totordamt', 'totlineamt', 'totinvamt'],
  // PO Lines (POEL)
  poel: ['unitcost', 'extcost', 'foreigncost', 'orderaltcost'],
  // PO Headers (POEH)
  poeh: ['totlineamt'],
  // Customer Master (ARSC)
  arsc: ['credlim'],
  // Customer Ship-To (ARSS)
  arss: ['credlim'],
  // Customer Pricing (PDSC) — all pricing fields
  pdsc: [
    'prcdisc_1', 'prcdisc_2', 'prcdisc_3', 'prcdisc_4', 'prcdisc_5',
    'prcdisc_6', 'prcdisc_7', 'prcdisc_8', 'prcdisc_9',
    'prcmult_1', 'prcmult_2', 'prcmult_3', 'prcmult_4', 'prcmult_5',
    'prcmult_6', 'prcmult_7', 'prcmult_8', 'prcmult_9',
    'costmult', 'costtype', 'costbasedon', 'pricecostty', 'prodcost',
    'ptarget', 'termspct', 'ovrridepctdown', 'ovrridepctup',
  ],
  // Vendor Pricing (PDSV) — all pricing fields
  pdsv: [
    'prcdisc_1', 'prcdisc_2', 'prcdisc_3', 'prcdisc_4', 'prcdisc_5',
    'prcdisc_6', 'prcdisc_7', 'prcdisc_8', 'prcdisc_9',
    'prcmult_1', 'prcmult_2', 'prcmult_3', 'prcmult_4', 'prcmult_5',
    'prcmult_6', 'prcmult_7', 'prcmult_8', 'prcmult_9',
    'costmult', 'costtype',
  ],
  // Product/Warehouse (ICSW)
  icsw: ['avgcost', 'lastcost', 'replcost', 'stndcost'],
  // Product Master (ICSP)
  icsp: ['baseprice', 'listprice', 'prodcost', 'stndcost'],
  // Inventory Transactions (ICET)
  icet: ['cost', 'origcost', 'icswcost'],
  // Physical Count Detail (ICSEP)
  icsep: ['cost', 'custcost', 'custqty', 'custqtyunavail'],
};

// Tier 3 (SENSITIVE) — banking, tax, 1099
const SENSITIVE_FIELDS = {
  // Vendor Master (APSV)
  apsv: ['vendbankacct', 'vendbankacctname', 'vendbanktrno', 'bankno', 'fedtaxid', 'fed1099no', 'fed1099box', 'ap1099nm'],
};

const MASK_VALUE = '●●●●●●';

// ─── Apply Masking ───
// Replaces new_value and old_value with mask for fields the user's role can't see.

function maskChanges(changes, role) {
  if (role >= ROLES.ADMIN) return changes; // Admin sees everything

  return changes.map(change => {
    const table = (change.source || '').toLowerCase();
    const field = change.field_name || '';

    // Check if this field needs finance-tier access
    if (role < ROLES.FINANCE) {
      const financeFields = FINANCE_FIELDS[table];
      if (financeFields && financeFields.includes(field)) {
        return { ...change, new_value: MASK_VALUE, old_value: MASK_VALUE, masked: true };
      }
    }

    // Check if this field needs sensitive-tier access
    if (role < ROLES.SENSITIVE) {
      const sensitiveFields = SENSITIVE_FIELDS[table];
      if (sensitiveFields && sensitiveFields.includes(field)) {
        return { ...change, new_value: MASK_VALUE, old_value: MASK_VALUE, masked: true };
      }
    }

    return change;
  });
}

// ─── Filter Tables by Role ───
// Removes security tables for non-admin users.

function filterTablesByRole(tables, role) {
  return tables.filter(t => canAccessTable(role, t));
}

// ─── Get Role Name ───

function getRoleName(role) {
  return Object.keys(ROLES).find(k => ROLES[k] === role) || 'UNKNOWN';
}

module.exports = {
  ROLES,
  getRoleGroupMapping,
  canAccessTable,
  maskChanges,
  filterTablesByRole,
  getRoleName,
  SECURITY_TABLES,
};
