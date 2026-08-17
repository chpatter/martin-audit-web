/**
 * Value Translations
 *
 * Maps coded/abbreviated field values to human-readable labels.
 * Applied during enrichment — values display as "1 (Ordered)" instead of just "1".
 *
 * Format: { 'table.field': { 'rawValue': 'Display Label' } }
 * Values are matched case-insensitively.
 */

const VALUE_TRANSLATIONS = {

  // ─── Stage Codes ───

  'oeeh.stagecd': {
    '0': 'Quoted',
    '1': 'Ordered',
    '2': 'Picked',
    '3': 'Shipped',
    '4': 'Invoiced',
    '5': 'Paid',
    '9': 'Cancelled',
  },

  'poeh.stagecd': {
    '0': 'Entered',
    '1': 'Ordered',
    '2': 'Printed',
    '3': 'Acknowledged',
    '4': 'Pre-receiving',
    '5': 'Received',
    '6': 'Costed',
    '7': 'Closed',
    '9': 'Cancelled',
  },

  'wteh.stagecd': {
    '0': 'Requested',
    '1': 'Ordered',
    '2': 'Picked',
    '3': 'Shipped',
    '4': 'Pre',
    '5': 'Exception',
    '6': 'Received',
    '9': 'Cancelled',
  },

  // ─── Status Types ───

  'poel.statustype': {
    'a': 'Active',
    'i': 'Inactive',
    'c': 'Cancel',
    's': 'Costed',
  },

  'wtel.statustype': {
    'a': 'Active',
    's': 'Shipped',
    'i': 'Inactive',
    'c': 'Canceled',
  },

  'icsw.statustype': {
    'd': 'Direct Ship',
    'o': 'Order as Needed',
    's': 'Stock',
    'x': 'Do not Reorder',
  },

  'arsc.statustype': {
    'a': 'Active',
    'i': 'Inactive',
  },

  'arss.statustype': {
    'a': 'Active',
    'i': 'Inactive',
  },

  'icsc.statustype': {
    'a': 'Active',
    'i': 'Inactive',
  },

  'pdsc.statustype': {
    'a': 'Active',
    'i': 'Inactive',
  },

  'pdsv.statustype': {
    'a': 'Active',
    'i': 'Inactive',
  },

  'apsv.statustype': {
    'a': 'Active',
    'i': 'Inactive',
  },

  'icsp.statustype': {
    'a': 'Active',
    'i': 'Inactive',
    'l': 'Labor',
    's': 'Superseded',
  },

  // ─── Approval Types ───

  'poeh.approvty': {
    'y': 'Approved',
    'n': 'Not Approved',
  },

  'oeeh.approvty': {
    'y': 'Approved',
    'n': 'Not Approved',
    'e': 'E-Hold',
  },

  // ─── Acknowledgment Types ───

  'poeh.acktype': {
    'manual': 'Manual',
    'reset': 'Reset',
    'edi': 'EDI',
  },

  'poeh.ackrsn': {
    'ad': 'Accepted, No Change',
    'ac': 'Accepted, With Change',
  },

  'poel.ackrsn': {
    'ia': 'Item Accepted',
    'ic': 'Item Accepted, Changes Made',
  },

  // ─── Product Types ───

  'icsp.prodtype': {
    's': 'Standard',
    'r': 'Remanufactured',
    'i': 'Implied',
    'c': 'Dirty Core',
  },

  'oeel.specnstype': {
    'n': 'Non-Stock',
    's': 'Special Order',
    'l': 'Lost Business',
    'e': 'External Comment',
    'i': 'Internal Comment',
    't': 'Subtotal Comment',
  },

  'oeel.ordertype': {
    'p': 'PO',
    't': 'Whse Transfer',
    'w': 'Work Order',
  },

  'oeel.disctype': {
    '$': 'Dollar',
    '%': 'Percent',
  },

  // ─── Pricing Types ───

  'pdsc.priceonty': {
    'l': 'List',
    'b': 'Base',
    'c': 'Cost Plus',
    'm': 'Margin',
    'rc': 'Rebate Cost',
    'rm': 'Rebate Margin',
  },

  'icsp.priceonty': {
    'l': 'List',
    'b': 'Base',
    'c': 'Cost',
  },

  'icsc.priceonty': {
    'b': 'Base Price',
    'l': 'List Price',
    'c': 'Cost',
  },

  'pdsc.disctype': {
    'q': 'Quantity',
    'd': 'Dollar Amount',
    'c': 'Customer',
  },

  'pdsc.pricecostty': {
    'a': 'Average Cost',
    's': 'Standard Cost',
    'l': 'Last Cost',
    'r': 'Replacement Cost',
  },

  'pdsc.qtybreakty': {
    'p': 'Price',
    'd': 'Discount',
  },

  'pdsc.qtytype': {
    'c': 'Contract',
    'm': 'Monthly',
    'y': 'Yearly',
  },

  'pdsc.pround': {
    'u': 'Rounds Up',
    'd': 'Rounds Down',
    'n': 'Nearest',
  },

  'pdsc.maxqtytype': {
    'c': 'Cube',
    'p': 'Special Prc Cost',
    's': 'Stocking Qty',
    'w': 'Weight',
  },

  // ─── Product Line (ICSL) Types ───

  'icsl.minbuytype': {
    'q': 'Quantity',
    'w': 'Weight',
    'd': 'Dollars',
    'c': 'Cubes',
  },

  'icsl.ordcalcty': {
    'e': 'EOQ',
    'c': 'Class',
    'm': 'Min/Max',
    'q': 'Qty Break',
    'b': 'Blanket Order',
    'h': 'Human (Manual)',
  },

  'icsl.surplusty': {
    'i': 'ICSW Usage Rate',
    'a': 'Actual Monthly Usage',
  },

  'icsl.taxablety': {
    'y': 'Yes',
    'n': 'No',
    'v': 'Variable (by Customer)',
  },

  'icsl.arptype': {
    'y': 'Yes',
    'n': 'No',
    'v': 'Variable (by Customer)',
  },

  'icsl.warrtype': {
    'm': 'Months',
    'd': 'Days',
    'y': 'Years',
  },

  'icsl.safeallty': {
    '%': 'Percent',
    'q': 'Quantity',
    'd': 'Days',
  },

  // ─── Special Price/Cost (ICSC) ───

  'icsc.speccostty': {
    'y': 'Yes',
    't': 'Thousand Costing',
    'h': 'Hundred Costing',
  },

  // ─── Vendor Types ───

  'apsv.proctype': {
    'e': 'Expense',
    't': 'Trade',
    'a': 'Third Party Addons',
  },

  'apsv.freightexpectedty': {
    'y': 'Yes',
    'n': 'No',
  },

  'apss.freightexpectedty': {
    'y': 'Yes',
    'n': 'No',
  },

  'apss.epotype': {
    'e': 'EDI',
    'm': 'Email',
    'f': 'Fax',
  },

  // ─── Transfer Approval ───

  'wtel.approvety': {
    'y': 'Yes',
    'r': 'Requested',
    'n': 'No',
  },

  // ─── Inventory Transaction Types ───

  'icet.transtype': {
    'un': 'Unavailable',
    'do': 'Direct Order',
    'ns': 'Non-Stock',
    're': 'Receipt',
    'ri': 'Return In',
    'sa': 'Stock Adjust',
    'ca': 'Cost Adjust',
    'ro': 'Return Out',
    'in': 'Invoice',
  },

  // ─── Count Record Types ───

  'icsep.rectype': {
    '1': 'Bin Location 1',
    '2': 'Bin Location 2',
    'w': 'Warehouse Managed Bin',
    'u': 'Unavailable Inventory',
  },

  'icset.rectype': {
    '1': 'Bin Location 1',
    '2': 'Bin Location 2',
    'w': 'Warehouse Managed Bin',
    'u': 'Unavailable Inventory',
  },

  'icsep.inventoryty': {
    'c': 'Customer Owned',
    'd': 'Distributor Owned',
  },

  // ─── Security (SASOO) ───

  'sasoo.oeslsrepfl': {
    'i': 'Inside Only',
    'o': 'Outside Only',
    'b': 'Both',
    'n': 'None',
  },

  'sasoo.oeqtyshipty': {
    'a': 'Allow Any',
    'd': 'Decrease Only',
    'n': 'Not Allowed',
  },

  'sasoo.icmanlistty': {
    'm': 'Manual Only',
    'e': 'Excel Only',
    'b': 'Both',
    'n': 'Neither',
  },

  'sasoo.oecostoverty': {
    'd': 'Drop Ship Only',
    's': 'Special Order Only',
    'b': 'Drop Ship & Special',
    'a': 'All Orders',
    'n': 'Not Allowed',
  },

  'sasoo.oensqtyshpty': {
    'a': 'Allow',
    'd': 'Decrease Only',
    'n': 'Not Allowed',
  },

  'sasoo.nscrtoanty': {
    'c': 'From Catalog',
    'n': 'From Non-Stock',
    'b': 'Both',
  },

  // ─── Security (PV_USER / PV_SECURE) ───

  'pv_user.contactmgmntSecrlev': {
    '1': 'No Access',
    '2': 'Inquiry',
    '3': 'Modify',
    '4': 'Add',
    '5': 'Delete',
  },

  'pv_secure.functionsecurity': {
    '1': 'No Access',
    '2': 'Inquiry Only',
    '3': 'Modify',
    '4': 'Add & Modify',
    '5': 'Full Access',
  },
};

/**
 * Translate a coded value for a specific table.field.
 * Returns "rawValue (Label)" if a translation exists, otherwise returns rawValue unchanged.
 */
function translateValue(table, field, rawValue) {
  if (!rawValue || rawValue === 'New' || rawValue === '(empty)') return rawValue;

  const key = `${table.toLowerCase()}.${field.toLowerCase()}`;
  const map = VALUE_TRANSLATIONS[key];
  if (!map) return rawValue;

  const clean = String(rawValue).trim().toLowerCase();
  const label = map[clean];
  if (!label) return rawValue;

  return `${rawValue} (${label})`;
}

/**
 * Get all translatable fields as a Set for quick lookup.
 */
const TRANSLATABLE_FIELDS = new Set(
  Object.keys(VALUE_TRANSLATIONS).map(k => k.split('.')[1])
);

module.exports = {
  VALUE_TRANSLATIONS,
  translateValue,
  TRANSLATABLE_FIELDS,
};
