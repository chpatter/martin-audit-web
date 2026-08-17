// Module definitions for the audit system sidebar.
// active: true = implemented, false = coming soon.
// badge: text shown in the header badge when this module is active.

const MODULES = [
  { id: 'catalog', label: 'Catalog', icon: '📖', active: true, badge: 'CATALOG CHANGES', description: 'Product catalog and item master' },
  { id: 'customers', label: 'Customers', icon: '👥', active: true, badge: 'CUSTOMER CHANGES', description: 'Customer master records' },
  { id: 'inventory', label: 'Inventory', icon: '📊', active: true, badge: 'INVENTORY CHANGES', description: 'Transactions, cycle counts, adjustments' },
  { id: 'orders', label: 'Orders', icon: '📋', active: true, badge: 'ORDER CHANGES', description: 'Sales orders and order changes' },
  { id: 'pricing_cust', label: 'Pricing-Customer', icon: '💲', active: true, badge: 'CUSTOMER PRICING CHANGES', description: 'Customer pricing and contracts' },
  { id: 'pricing_vend', label: 'Pricing-Vendor', icon: '💰', active: true, badge: 'VENDOR PRICING CHANGES', description: 'Vendor pricing and cost agreements' },
  { id: 'prod_line', label: 'Product Line', icon: '📐', active: true, badge: 'PRODUCT LINE CHANGES', description: 'Product line setup — buyers, vendors, ordering' },
  { id: 'products', label: 'Products', icon: '🏷️', active: true, badge: 'PRODUCT CHANGES', description: 'Product master settings' },
  { id: 'purchases', label: 'Purchases', icon: '🧾', active: true, badge: 'PURCHASE ORDER CHANGES', description: 'Purchase orders, receiving, costing' },
  { id: 'security', label: 'Security', icon: '🔒', active: true, badge: 'SECURITY CHANGES', description: 'User access and security audit' },
  { id: 'transfers', label: 'Transfers', icon: '🔄', active: true, badge: 'TRANSFER CHANGES', description: 'Warehouse transfers' },
  { id: 'vendors', label: 'Vendors', icon: '🏭', active: true, badge: 'VENDOR CHANGES', description: 'Vendor master records' },
  { id: 'warehouse', label: 'Warehouse', icon: '🏢', active: true, badge: 'WAREHOUSE CHANGES', description: 'Warehouse product settings — bins, costs, lead times, status' },
];

export default MODULES;
