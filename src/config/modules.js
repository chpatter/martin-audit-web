// Module definitions for the audit system sidebar.
// active: true = implemented, false = coming soon.
// badge: text shown in the header badge when this module is active.

const MODULES = [
  { id: 'catalog', label: 'Catalog', icon: '📖', active: true, badge: 'CATALOG CHANGES', description: 'Product catalog and item master', tooltip: 'Queries ICSC — catalog product setup including pricing, descriptions, vendor info, and UOM.' },
  { id: 'customers', label: 'Customers', icon: '👥', active: true, badge: 'CUSTOMER CHANGES', description: 'Customer master records', tooltip: 'Queries ARSC (customer master) and ARSS (ship-to records) — addresses, terms, reps, credit.' },
  { id: 'inventory', label: 'Inventory', icon: '📊', active: true, badge: 'INVENTORY CHANGES', description: 'Transactions, cycle counts, adjustments', tooltip: 'Queries ICET (transactions), ICSEP (physical counts), and ICSET (count tickets) — adjustments, receipts, cycle counts.' },
  { id: 'orders', label: 'Orders', icon: '📋', active: true, badge: 'ORDER CHANGES', description: 'Sales orders and order changes', tooltip: 'Queries OEEH (order headers) and OEEL (order lines) — stage, pricing, quantities, ship-to, approvals.' },
  { id: 'pricing_cust', label: 'Pricing-Customer', icon: '💲', active: true, badge: 'CUSTOMER PRICING CHANGES', description: 'Customer pricing and contracts', tooltip: 'Queries PDSC — customer price/discount records including multipliers, qty breaks, and contracts.' },
  { id: 'pricing_vend', label: 'Pricing-Vendor', icon: '💰', active: true, badge: 'VENDOR PRICING CHANGES', description: 'Vendor pricing and cost agreements', tooltip: 'Queries PDSV — vendor cost agreements, price breaks, and discount schedules.' },
  { id: 'prod_line', label: 'Product Line', icon: '📐', active: true, badge: 'PRODUCT LINE CHANGES', description: 'Product line setup — buyers, vendors, ordering', tooltip: 'Queries ICSL — product line setup including buyers, vendors, ordering parameters, and discounts.' },
  { id: 'products', label: 'Products', icon: '🏷️', active: true, badge: 'PRODUCT CHANGES', description: 'Product master and warehouse settings', tooltip: 'Queries ICSP (product master) and ICSW (warehouse product) — descriptions, pricing, status, bin locations, costs, lead times.' },
  { id: 'purchases', label: 'Purchases', icon: '🧾', active: true, badge: 'PURCHASE ORDER CHANGES', description: 'Purchase orders, receiving, costing', tooltip: 'Queries POEH (PO headers) and POEL (PO lines) — stage, dates, costs, quantities, acknowledgments.' },
  { id: 'security', label: 'Security', icon: '🔒', active: true, badge: 'SECURITY CHANGES', description: 'User access and security audit', tooltip: 'Queries SASOO (operator setup), PV_USER (user profile), PV_SECURE (function security), and AUTHSECURE (authorization). Admin only.' },
  { id: 'transfers', label: 'Transfers', icon: '🔄', active: true, badge: 'TRANSFER CHANGES', description: 'Warehouse transfers', tooltip: 'Queries WTEH (transfer headers) and WTEL (transfer lines) — stage, quantities, warehouses, approvals.' },
  { id: 'vendors', label: 'Vendors', icon: '🏭', active: true, badge: 'VENDOR CHANGES', description: 'Vendor master records', tooltip: 'Queries APSV (vendor master) and APSS (ship-from records) — banking, 1099, freight, terms.' },
];

export default MODULES;
