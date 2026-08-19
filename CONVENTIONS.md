# Development Conventions — Martin Audit System

This file defines how we build, not what we've built. Paste this alongside Project-Context.md when starting a new AI chat session to maintain uniformity.

---

## Coding Style

### JavaScript
- Functional components only, no class components
- Hooks for all state management (useState, useEffect, useMemo, useCallback, useRef)
- Destructuring for props and state
- Template literals for string interpolation
- Single quotes for strings in JS, double quotes for JSX attributes
- No semicolons — wait, we DO use semicolons everywhere. Be consistent.
- `const` over `let`, never `var`

### React Patterns
- Shared logic lives in custom hooks (`src/hooks/`), not duplicated across pages
- Every page follows the same template: config constants at top → export default function → same JSX structure
- Components are single-purpose files, one export per file
- Inline styles with theme tokens — no CSS files, no CSS modules, no styled-components
- Theme-aware: all colors, fonts, radii come from `theme.colors.*`, `theme.fonts.*`, `theme.radii.*`

### Backend Patterns
- Express middleware chain: rate limiter → auth → role check → audit log → route handler
- All user input sanitized before SQL: `sanitize()`, `sanitizeNum()`, `sanitizeDate()`
- Compass queries built with string interpolation after sanitization — no ORM
- Lookup caches refresh hourly, loaded at startup via `preloadCaches()`
- Enrichment happens server-side before response: names, value translations, field masking
- Errors logged server-side, sanitized before sending to client

### File Organization
- Server code: `server/` — each file has one responsibility
- React pages: `src/pages/` — one per module, all follow the same structure
- React components: `src/components/` — shared UI pieces
- Config: `src/config/` — modules, themes, patch notes
- Hooks: `src/hooks/` — shared state logic
- Utils: `src/utils/` — pure formatting functions

---

## How We Add Features

### New Tracked Field
1. One line in `server/tracked-fields.js`
2. If cost/pricing → add to `FINANCE_FIELDS` in `roles.js`
3. If banking/tax → add to `SENSITIVE_FIELDS` in `roles.js`
4. Done. No other code changes.

### New Search Filter
1. Add `show*` prop to `FilterBar.js` (default false)
2. Add input element with `onKeyDown` Enter handler and `InfoTip`
3. Add to `hasFilters` check
4. Add to `useChangeSearch.js` — filter state, search handler, clear handler
5. Add WHERE clause in `queryVariations()` in `server/index.js`
6. Add to route handler destructuring and filters objects
7. Pass `show*` on the page(s) that need it

### New Module
1. `TABLE_CONFIG` in `server/tracked-fields.js`
2. `TRACKED_FIELDS` in `server/tracked-fields.js`
3. Finance/sensitive fields in `server/roles.js`
4. New page file in `src/pages/` — copy existing, change config
5. Register in `src/config/modules.js` (alphabetical, with tooltip)
6. Import + PAGE_MAP in `src/App.js`
7. Add table to `TABLES_WITH_*` arrays in `server/index.js` if needed

### New Lookup Cache
1. Add cache variable and timestamp in `server/lookups.js`
2. Add load function (Compass query or SXe API call)
3. Add to `preloadCaches()`
4. Add to `enrichChanges()` parameters and enrichment logic
5. Update `enrich()` in `server/index.js` to load and pass it
6. If searchable dropdown needed: add API endpoint + frontend Select component
7. Export from `module.exports`

### New Value Translation
1. One entry in `server/value-translations.js`: `'table.field': { 'value': 'Label' }`
2. Done. Enrichment picks it up automatically.

---

## Page Template

Every module page follows this exact structure:

```jsx
import React from 'react';
import { useTheme } from '../config/ThemeContext';
import useChangeSearch from '../hooks/useChangeSearch';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import ResultFilters from '../components/ResultFilters';
import ChangesTable from '../components/ChangesTable';
import { formatDateTime } from '../utils/format';

// ─── Module config ───
const SOURCE_TABLES = [...];
const SOURCE_OPTIONS = [...];
const FILTER_KEYS = [...];
const FILTER_LABELS = {...};
const COLUMNS = [...];
const CSV_HEADERS = [...];
function csvRowMapper(row) { return [...]; }

// ─── Page Component ───
export default function ModulePage() {
  const { theme } = useTheme();
  const { changes, filters, setFilters, ... } = useChangeSearch({
    defaultTables: ['table1', 'table2'],
    filterKeys: FILTER_KEYS, csvHeaders: CSV_HEADERS, csvRowMapper,
    exportFilename: 'module-changes',
  });

  return (
    <>
      <StatsBar ... />
      <FilterBar ... />
      {error && <error display>}
      <results summary + text filter>
      <ResultFilters ... />
      <ChangesTable ... />
    </>
  );
}
```

---

## UI Conventions

- Dark theme is default, light theme available via toggle
- Red accent color (`#c00000`) for branding — Martin red
- No external CSS libraries — pure inline styles with theme tokens
- InfoTip "i" icons on all search fields and sidebar modules
- Searchable dropdowns for operators (OperatorSelect) and buyers (BuyerSelect)
- Patch notes modal with sidebar navigation, NEW badge via localStorage
- Update banner polls `/api/version` every 5 min, shows refresh prompt on mismatch
- Loading spinner in table while querying, distinct empty states (pre-search, no results)
- Enter key triggers search from all input fields
- CSV export wraps scientific notation values in `="value"` for Excel compatibility

## Naming Conventions

- Page files: `ModuleNamePage.js` (PascalCase)
- Components: `ComponentName.js` (PascalCase)
- Hooks: `useHookName.js` (camelCase with use prefix)
- Config files: `camelCase.js`
- Server files: `kebab-or-camelCase.js`
- Module IDs: `snake_case` (e.g., `prod_line`, `pricing_cust`)
- CSS/style: inline objects using theme tokens, never hardcoded colors

## Communication Style with AI

- Always clone from `dev` branch: `git clone -b dev`
- Only send changed files, not the full project
- Don't change `package.json` version unless asked
- Don't modify `web.config` or `iisnode.yml`
- Don't add packages without asking
- Test locally before pushing
- Keep field descriptions matching Infor data dictionary where possible
- Patch notes updated with every set of changes
- Project-Context.md updated when modules, fields, or architecture changes

---

## Architecture Decisions Log

| Decision | Why | Date |
|----------|-----|------|
| React + Express, not Electron | Web deployment, boss wanted compliance checkboxes | May 2026 |
| iisnode, not ARR proxy | IIS runs URL Rewrite before auth — LOGON_USER was empty with ARR | May 2026 |
| Server-side field masking | Real values never reach browser | May 2026 |
| Additive role tiers | Each tier includes everything below | May 2026 |
| dev/main branch strategy | Auto-deploy on merge to main via GitHub Actions | Jun 2026 |
| Separate Products and Warehouse pages | Users requested split — different data, different users | Aug 2026 |
| ICSL on its own page | Different search keys (prodline vs prod) | Jun 2026 |
| Sales rep lookup from smsn | Only table with rep code → name mapping | Jun 2026 |
| Buyer lookup from SASTT via SXe API | Buyer codes ≠ operator codes. codeid='B', filename='a' | Jul 2026 |
| Value translations in separate file | Easy to maintain, one entry per field, auto-applied during enrichment | Aug 2026 |
| CRA over Vite | Started with CRA, migration to Vite is future task | May 2026 |

---

## What NOT to Do

1. Don't use `localStorage` for anything except the patch notes NEW badge
2. Don't add new npm packages without discussing first
3. Don't change the IIS config files (web.config, iisnode.yml)
4. Don't hardcode colors — use theme tokens
5. Don't duplicate logic across pages — put it in hooks or shared components
6. Don't use `binloc` for ICSW — the correct fields are `binloc1` and `binloc2`
7. Don't use the operator cache for buyer enrichment — use the buyer cache (SASTT)
8. Don't silently override user-visible filters with hidden logic
9. Don't track `setno`, `usagefl`, `usageprod`, `usagewhse`, `exchgrate` on ICET — removed as noise
10. Don't put `allvariations()` in regular SQL — it's a Compass Data Lake function only
