/**
 * Patch Notes
 *
 * Add new versions to the TOP of this array (newest first).
 * The modal displays them in this order.
 *
 * Each version has:
 *   - version: semver string (e.g., '1.0.1')
 *   - date: release date string
 *   - title: short summary
 *   - changes: array of { type, text } objects
 *
 * Change types: 'added', 'changed', 'fixed', 'removed'
 */

const PATCH_NOTES = [
  {
    version: '1.0.1',
    date: '2026-06-10',
    title: 'Inventory Module & Field Expansion',
    changes: [
      { type: 'added', text: 'Version check. A popup will alert the user to refresh the page if the current version is out of date' },
      { type: 'added', text: 'Inventory module — ICET (Transactions), ICSEP (Physical Counts), ICSET (Count Tickets)' },
      { type: 'added', text: 'Bin Location #1, Bin Location #2, and Bin Type fields to Prod/Whse (ICSW)' },
      { type: 'added', text: 'User Defined fields 1–24 added to Transfer Lines (WTEL)' },
      { type: 'added', text: 'Transfer Header expanded — last stage, reason code, dates, financial totals, personnel fields' },
      { type: 'added', text: 'Transfer Line expanded — approval date/type, bin location, stocking quantities, net amounts, operator' },
      { type: 'added', text: 'Restored ICSP pricing fields — base price, list price, product cost, standard cost' },
      { type: 'added', text: 'Restored POEL cost fields — unit cost, extended cost, foreign cost, order alt cost' },
      { type: 'added', text: 'Restored POEH total line amount' },
      { type: 'added', text: 'Restored ICSC cost multiplier and cost type' },
      { type: 'added', text: 'Restored OEEH address override and order source fields' },
      { type: 'added', text: 'Restored OEEL special price type' },
      { type: 'added', text: 'Audit logging — every search, lookup, and access logged with username, role, and timestamp' },
      { type: 'fixed', text: 'CSV export no longer mangles bin locations containing "E" (Excel scientific notation fix)' },
      { type: 'fixed', text: 'Products and catalogs no longer show "-0" suffix in record column' },
      { type: 'changed', text: 'Field descriptions updated to match Infor data dictionary' },
      { type: 'changed', text: 'Transfer stage codes corrected: 0=Requested, 4=Pre, 5=Exception, 6=Received, 9=Cancelled' },
      { type: 'changed', text: 'Transfer line status descriptions corrected: (A)ctive, (S)hipped, (I)nactive, (C)anceled' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-12',
    title: 'Initial Launch',
    changes: [
      { type: 'added', text: '10 audit modules: Catalog, Customers, Orders, Pricing-Customer, Pricing-Vendor, Prod/Whse, Purchases, Security, Transfers, Vendors' },
      { type: 'added', text: 'Windows SSO via IIS + iisnode — no login required on domain-joined machines' },
      { type: 'added', text: '4-tier role-based access control (Users, Finance, Sensitive, Admin) with server-side field masking' },
      { type: 'added', text: 'Dark/light theme toggle' },
      { type: 'added', text: 'CSV export on all modules' },
      { type: 'added', text: 'Column filters with auto-hide for single-value columns' },
      { type: 'added', text: 'Expandable row detail view with field descriptions' },
      { type: 'added', text: 'Real-time search with cancel support' },
    ],
  },
];

// Current version — should match package.json
export const CURRENT_VERSION = PATCH_NOTES[0]?.version || '1.0.0';

export default PATCH_NOTES;
