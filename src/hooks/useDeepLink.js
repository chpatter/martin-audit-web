import { useState, useEffect, useCallback } from 'react';

/**
 * Maps CSD entity types / SXe table names to audit app module IDs.
 * Used for both inforBusinessContext and ViewSxeEntities messages.
 */
const ENTITY_TO_MODULE = {
  // inforBusinessContext entityType values
  OrderEntryHeader: { module: 'orders', idField: 'id1' },
  CustomerMaster:   { module: 'customers', idField: 'id2' },
  ARShipTo:         { module: 'customers', idField: 'id2' },
  PurchaseOrderHeader: { module: 'purchases', idField: 'id1' },
  ItemMaster:       { module: 'prod_whse', idField: 'id1' },
  VendorMaster:     { module: 'vendors', idField: 'id1' },
  WarehouseTransferHeader: { module: 'transfers', idField: 'id1' },

  // ViewSxeEntities entity (table) values
  oeeh: { module: 'orders', keyField: 'primaryKey' },
  oeel: { module: 'orders', keyField: 'primaryKey' },
  arsc: { module: 'customers', keyField: 'primaryKey' },
  arss: { module: 'customers', keyField: 'primaryKey' },
  poeh: { module: 'purchases', keyField: 'primaryKey' },
  poel: { module: 'purchases', keyField: 'primaryKey' },
  icsp: { module: 'prod_whse', keyField: 'primaryKey' },
  icsw: { module: 'prod_whse', keyField: 'primaryKey' },
  apsv: { module: 'vendors', keyField: 'primaryKey' },
  apss: { module: 'vendors', keyField: 'primaryKey' },
  wteh: { module: 'transfers', keyField: 'primaryKey' },
  wtel: { module: 'transfers', keyField: 'primaryKey' },
  pdsc: { module: 'pricing_cust', keyField: 'primaryKey' },
  pdsr: { module: 'pricing_cust', keyField: 'primaryKey' },
  pdsv: { module: 'pricing_vend', keyField: 'primaryKey' },
};

/**
 * Priority order: when multiple entities arrive (e.g. order page sends
 * OrderEntryHeader + CustomerMaster + ARShipTo), pick the most specific one.
 */
const MODULE_PRIORITY = ['orders', 'purchases', 'transfers', 'prod_whse', 'catalog',
  'pricing_cust', 'pricing_vend', 'vendors', 'customers', 'inventory'];

/**
 * Hook that provides deep-link context from URL params and CSD postMessage.
 *
 * Returns:
 *   - deepLink: { module, record } | null — the current deep link target
 *   - contextInfo: { source, entity, description } — metadata about where the context came from
 *   - clearDeepLink: () => void — call after navigating + auto-searching to prevent re-triggers
 *   - pendingContext: { module, record, source, description } | null — latest CSD context (for "Run Audit" button)
 */
export default function useDeepLink() {
  const [deepLink, setDeepLink] = useState(null);
  const [contextInfo, setContextInfo] = useState(null);
  const [pendingContext, setPendingContext] = useState(null);

  // ── Read URL params on mount ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const module = params.get('module');
    const record = params.get('record');

    if (module && record) {
      setDeepLink({ module, record });
      setContextInfo({ source: 'url', entity: module, description: `URL deep link: ${record}` });

      // Clean the URL so refreshing doesn't re-trigger
      const url = new URL(window.location);
      url.searchParams.delete('module');
      url.searchParams.delete('record');
      window.history.replaceState({}, '', url.pathname);
    }
  }, []);

  // ── Listen for CSD context messages (postMessage) ──
  useEffect(() => {
    function handleMessage(event) {
      try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Unwrap workspaceProxyMessage wrapper if present
        const msg = raw?.type === 'workspaceProxyMessage' ? raw.data : raw;
        if (!msg?.type) return;

        // ── inforBusinessContext ──
        if (msg.type === 'inforBusinessContext' && msg.entities?.length > 0) {
          const candidates = [];

          for (const entity of msg.entities) {
            const mapping = ENTITY_TO_MODULE[entity.entityType];
            if (!mapping) continue;
            const record = String(entity[mapping.idField] || '');
            if (!record) continue;
            candidates.push({
              module: mapping.module,
              record,
              description: entity.description || entity.name || '',
              entityType: entity.entityType,
            });
          }

          if (candidates.length === 0) return;

          // Pick highest-priority module
          candidates.sort((a, b) =>
            MODULE_PRIORITY.indexOf(a.module) - MODULE_PRIORITY.indexOf(b.module)
          );

          const best = candidates[0];
          setPendingContext({
            module: best.module,
            record: best.record,
            source: 'inforBusinessContext',
            description: best.description,
            entityType: best.entityType,
            allEntities: candidates,
          });
        }

        // ── ViewSxeEntities (SXe-specific, simpler format) ──
        if (msg.type === 'ViewSxeEntities' && msg.data?.data?.length > 0) {
          const candidates = [];

          for (const item of msg.data.data) {
            const mapping = ENTITY_TO_MODULE[item.entity];
            if (!mapping) continue;
            const record = String(item[mapping.keyField] || '');
            if (!record) continue;
            candidates.push({
              module: mapping.module,
              record,
              entity: item.entity,
            });
          }

          if (candidates.length === 0) return;

          candidates.sort((a, b) =>
            MODULE_PRIORITY.indexOf(a.module) - MODULE_PRIORITY.indexOf(b.module)
          );

          const best = candidates[0];
          setPendingContext(prev => {
            // Don't overwrite a richer inforBusinessContext with ViewSxeEntities
            if (prev?.source === 'inforBusinessContext') return prev;
            return {
              module: best.module,
              record: best.record,
              source: 'ViewSxeEntities',
              description: '',
              allEntities: candidates,
            };
          });
        }
      } catch {
        // Not a context message, ignore
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const clearDeepLink = useCallback(() => {
    setDeepLink(null);
    setContextInfo(null);
  }, []);

  // Promote pending context to active deep link (user clicked "Run Audit")
  const activateContext = useCallback(() => {
    if (!pendingContext) return;
    setDeepLink({ module: pendingContext.module, record: pendingContext.record });
    setContextInfo({
      source: pendingContext.source,
      entity: pendingContext.entityType || pendingContext.module,
      description: pendingContext.description,
    });
  }, [pendingContext]);

  return { deepLink, contextInfo, clearDeepLink, pendingContext, activateContext };
}
