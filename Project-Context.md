# Martin Audit System — Project Context

Paste this at the start of a new AI chat to continue working on the project. This file contains everything the AI needs to stay accurate and consistent.

---

## What It Is

Internal web app for Martin Supply replacing Agile Dragon's Dragon Pack Audit. Tracks field-level changes across Infor CloudSuite SXe by querying Compass Data Lake's `allvariations()` function, comparing consecutive record versions to detect what changed, when, and by whom.

**Current Version:** 1.0.3
**Production URL:** https://audit.martinsupply.com

## Repos & Branches

- **Company (production):** https://github.com/MartinSupply/martin-audit-web — has GitHub Actions runner
- **Personal (backup):** https://github.com/chpatter/martin-audit-web — portfolio mirror
- Both push simultaneously via git remote config
- **`dev` branch** — daily work, test locally, push freely
- **`main` branch** — production. Merge from dev triggers auto-deploy via GitHub Actions
- **ALWAYS clone/pull from `dev` branch** when making changes: `git clone -b dev`

## Production Server

- **Server:** 25MARTINAPP01 (Windows Server VM), IP 10.100.1.148
- **App Path:** C:\inetpub\martin-audit-app
- **IIS Site:** Martin Audit, port 443, HTTPS with internal wildcard cert
- **Runner:** C:\actions-runner, runs as LOCAL SYSTEM Windows service

---

## Architecture — How Requests Flow

```
Browser → IIS (Windows Auth) → iisnode → Node.js/Express → Compass Data Lake
```

1. Browser loads React app from IIS as static files from `build/` subfolder
2. IIS authenticates via Kerberos/NTLM (Windows Auth) — anonymous is DISABLED
3. iisnode runs Node.js INSIDE the IIS worker process (no separate port, no PM2, no ARR reverse proxy)
4. iisnode promotes the verified `AUTH_USER` to a request header via `iisnode.yml`
5. Node.js reads the header, checks AD group membership via LDAP, assigns a role tier
6. Node.js authenticates to Infor via OAuth2 (grant_type=password) using the MAUD service account
7. Queries Compass Data Lake using `SELECT * FROM infor.allvariations('tablename') WHERE ...`
8. Compass returns every historical version of matching records
9. `changes.js` compares consecutive versions to detect field-level changes
10. `lookups.js` enriches results with vendor/customer/operator/sales rep names
11. `roles.js` masks sensitive fields based on user's role tier
12. Response sent to browser

### Why iisnode (not ARR/reverse proxy)

IIS runs URL Rewrite BEFORE authentication. With ARR reverse proxy, `{LOGON_USER}` was always empty because the rewrite happened before Windows Auth completed. iisnode runs Node.js AFTER auth completes, so the authenticated user identity is available.

### Key Config Files for IIS

- `web.config` (project root) — iisnode handler for `server/index.js`, static file serving from `build/`, SPA fallback to `build/index.html`
- `iisnode.yml` — promotes `AUTH_USER` server variable to Node.js via `promoteServerVars: AUTH_USER`
- IIS site physical path must be the PROJECT ROOT, not `build/`

---

## How the Change Detection Engine Works

### Query Flow (server/index.js → server/compass.js)

1. Frontend sends `POST /api/changes/search` with filters (tables, record#, dates, warehouse, etc.)
2. Backend loops through requested tables, calling `queryVariations(table, filters)` for each
3. `queryVariations` builds a SQL query: `SELECT * FROM infor.allvariations('tablename') WHERE ...`
4. SQL is sent to Compass Data Lake via 3-step process: submit job → poll for completion → fetch results
5. Raw rows come back — every historical version of each matching record

### Comparison Engine (server/changes.js)

1. Groups rows by record key (e.g., all versions of PO 5167702-0)
2. Sorts by `VariationId` (chronological order)
3. Walks through pairs: compares version N to version N+1
4. For each tracked field, if the value differs between versions, that's a "change"
5. New records (first version) are flagged with `change_type: 'new'`, `old_value: 'New'`
6. Each change includes: source table, record#, field name/label, old value, new value, timestamp, operator
7. The `hasSuffix` flag is set based on `TABLE_CONFIG.suffixKey` — controls whether record column shows "-0" suffix

### Table Configuration (server/tracked-fields.js)

Two exports:

**TABLE_CONFIG** — maps each table's key structure:
```js
poeh: { recordKey: 'pono', suffixKey: 'posuf', lineKey: null, recordKeyType: 'number' }
icsp: { recordKey: 'prod', suffixKey: null, lineKey: null, recordKeyType: 'string' }
```
- `recordKey` — the primary search field (mapped from frontend's `pono` filter)
- `suffixKey` — if present, shown as "-X" in the record column; if null, `hasSuffix: false`
- `lineKey` — secondary grouping (line number, warehouse, ship-to)
- `recordKeyType` — 'string' values get quoted in SQL, 'number' values don't

**TRACKED_FIELDS** — which fields to monitor per table:
```js
poeh: {
  stagecd: { label: 'Stage Code', desc: 'Description shown in expanded row...' },
  ...
}
```
Only fields listed here are compared. Adding a field = one line. No other code changes needed.

### Backend Search Filters

The `queryVariations` function supports these WHERE clauses:

| Filter | SQL Column | Applied To | Notes |
|--------|-----------|-----------|-------|
| `pono` | `recordKey` from TABLE_CONFIG | All tables | Quoted for string types, unquoted for numbers |
| `posuf` | `suffixKey` from TABLE_CONFIG | Tables with suffixes | PO/order/transfer suffix |
| `fromDate` | `transdt >=` | All tables | YYYY-MM-DD format only |
| `toDate` | `transdt <=` | All tables | YYYY-MM-DD format only |
| `whse` | `whse` | All tables | Direct match |
| `operinit` | `operinit` | All tables | Auto-uppercased |
| `vendno` | `vendno` | TABLES_WITH_VENDNO only | poeh, poel, apsv, apss, pdsc, pdsv, icsl |
| `custno` | `custno` | TABLES_WITH_CUSTNO only | arsc, arss, oeeh, oeel, pdsc |
| `prod` | `prod` | TABLES_WITH_PROD only | poel, oeel, icsp, icsw, icsc, pdsc, pdsv |

**Adding a new filter column:** Add to the `TABLES_WITH_*` array in `queryVariations()`, add the WHERE clause logic, add to the route handler's destructuring, add to `useChangeSearch` filter state/handler/clear, add `show*` prop to FilterBar.

### Input Sanitization (server/index.js)

Three sanitizer functions protect against SQL injection:
- `sanitize(val)` — strips everything except `[a-zA-Z0-9-_./]`, truncates to 200 chars
- `sanitizeNum(val)` — returns null if not a valid number
- `sanitizeDate(val)` — only accepts exact `YYYY-MM-DD` format

---

## Name Enrichment (server/lookups.js)

Four caches, all refresh hourly:

| Cache | Source | Query | Usage |
|-------|--------|-------|-------|
| vendorCache | Compass | `SELECT vendno, name FROM apsv` | Adds `vendname` column |
| customerCache | Compass | `SELECT custno, name FROM arsc` | Adds `custname` column |
| salesRepCache | Compass | `SELECT slsrep, name FROM smsn` | Inline-enriches `slsrepin`, `slsrepout` values |
| operatorCache | SXe API | `sasogetoperatorlist` endpoint | Adds `opername` column + enriches `buyer` values |

**Column enrichment** (vendname, custname, opername): Adds a new display column to each change record.

**Inline enrichment** (sales reps, buyers): Modifies `new_value` and `old_value` directly. Example: `2812` → `2812 (NATE SCHLICHTING)`. Only applies to specific `field_name` values:
- `slsrepin`, `slsrepout` → salesRepCache
- `buyer` → operatorCache (buyer codes = operator initials)

**Operator endpoint** (`GET /api/operators`): Returns cached operator list sorted by code, filtered to exclude deactivated accounts (names starting with "X "). Used by the `OperatorSelect` dropdown component on the frontend.

---

## RBAC — 4-Tier Role-Based Access (server/roles.js)

AD security groups (must be on-prem ADUC — cloud-only Entra groups don't work with LDAP):

| AD Group | Role | Modules | What's Visible |
|----------|------|---------|---------------|
| Martin-Audit-Users | USERS | 11 (no Security) | Operational fields only. Pricing/cost/banking masked as `●●●●●●` |
| Martin-Audit-Finance | FINANCE | 11 (no Security) | + pricing, costs, margins, credit limits, discounts |
| Martin-Audit-Sensitive | SENSITIVE | 11 (no Security) | + bank accounts, routing numbers, tax IDs, 1099 info |
| Martin-Audit-Admin | ADMIN | All 12 | Everything unmasked, including Security module |

**Masking is server-side.** `maskChanges()` replaces real values with `●●●●●●` before the response is sent. The browser never receives the actual data. There is nothing to unredact client-side.

**FINANCE_FIELDS** — fields masked for USERS, visible for FINANCE+:
- icsc: baseprice, listprice, prodcost, stndcost, rebatecost, pricetype, priceonty, costmult, costtype
- oeel: price, netamt, netord, custcost, discamt, discpct, disctype, commcost, priceoverfl, pricetype, specprcty
- oeeh: totcost, totordamt, totlineamt, totinvamt
- poel: unitcost, extcost, foreigncost, orderaltcost
- poeh: totlineamt
- arsc/arss: credlim
- icsw: avgcost, lastcost, replcost, stndcost
- icsp: baseprice, listprice, prodcost, stndcost
- icet: cost, origcost, icswcost
- icsep: cost, custcost, custqty, custqtyunavail
- wtel: prodcost, netamt, netord, netrcv
- wteh: totlineamt, totordamt, totshipamt, totrcvamt
- icsl: discmult_1-9, tarbuyamt_1-9, termspct, termsdiscfl, safeallamt, safeallpct, safeallty, rcvtolpct, ickcost, icrcost, wtkcost, wtrcost

**SENSITIVE_FIELDS** — fields masked for USERS and FINANCE, visible for SENSITIVE+:
- apsv: vendbankacct, vendbankacctname, vendbanktrno, bankno, fedtaxid, fed1099no, fed1099box, ap1099nm

**AD Authentication (server/auth-ad.js):**
- Reads `x-iisnode-auth_user` header (populated by iisnode after IIS auth)
- Checks AD group membership via LDAP using the MartinAudit service account
- 15-minute membership cache per user
- Fail-closed: if AD lookup fails, user gets no access

---

## Modules (12 total, 23 tables, ~956 tracked fields)

| Module | Page File | Tables | Fields | Search Fields |
|--------|-----------|--------|--------|--------------|
| Catalog | CatalogPage.js | ICSC | 50 | Catalog#, Source, Operator, Dates, Limit |
| Customers | CustomersPage.js | ARSC, ARSS | 45+45 | Customer#, Source, Operator, Dates, Limit |
| Inventory | InventoryPage.js | ICET, ICSEP, ICSET | 34+31+23 | Product#, Source, Warehouse, Operator, Dates, Limit |
| Orders | OrdersPage.js | OEEH, OEEL | 66+56 | Order#, Source, Warehouse, Customer#, Operator, Dates, Limit |
| Pricing-Customer | PricingCustPage.js | PDSC | 77 | Record#, Source, Warehouse, Customer#, Product#, Operator, Dates, Limit |
| Pricing-Vendor | PricingVendPage.js | PDSV | 44 | Vendor#, Source, Product#, Operator, Dates, Limit |
| Prod/Whse | ProdWhsePage.js | ICSP, ICSW | 16+28 | Product#, Source, Warehouse, Operator, Dates, Limit |
| Prod Line | ProdLinePage.js | ICSL | 56 | ProdLine, Source, Warehouse, Vendor#, Operator, Dates, Limit |
| Purchases | PurchasesPage.js | POEH, POEL | 34+23 | PO#, Source, Warehouse, Operator, Dates, Limit |
| Security | SecurityPage.js | SASOO, PV_USER, PV_SECURE, AUTHSECURE | 90+46+3+10 | Operator(dropdown), Source, Operator ID, Dates, Limit |
| Transfers | TransfersPage.js | WTEH, WTEL | 24+46 | Transfer#, Source, Operator, Dates, Limit |
| Vendors | VendorsPage.js | APSV, APSS | 63+47 | Vendor#, Source, Operator, Dates, Limit |

---

## Frontend Architecture

### Shared Hook Pattern (src/hooks/useChangeSearch.js)

ALL 12 module pages use the same hook. Each page passes different config:

```js
const { changes, filters, setFilters, loading, error, hasSearched, sortedChanges,
  handleSearch, handleClear, handleSort, handleExportCSV, ... } = useChangeSearch({
  defaultTables: ['poeh', 'poel'],        // which tables to query
  filterKeys: FILTER_KEYS,                // which column filters to show
  csvHeaders: CSV_HEADERS,                // CSV export column names
  csvRowMapper: csvRowMapper,             // how to format each row for CSV
  exportFilename: 'purchase-order-changes', // download filename
});
```

The hook manages: filter state, search execution, sorting, column filtering, text filtering, CSV export, loading/error/hasSearched states, cancellation.

**Default start date:** Pre-populated to 7 days ago (visible in the UI). Clear button fully empties all fields. The 7-day default is a safety net to prevent accidentally pulling entire table histories.

**Filter state includes:** `fromDate, toDate, pono, whse, source, custno, vendno, operinit, prod, limit, includeNew`

### Page Structure

Every page follows the same pattern:
1. Define `SOURCE_TABLES` (for StatsBar colors), `SOURCE_OPTIONS` (for dropdown), `COLUMNS`, `FILTER_KEYS`, `CSV_HEADERS`, `csvRowMapper`
2. Call `useChangeSearch` with config
3. Render: `StatsBar → FilterBar → error display → results summary → ResultFilters → ChangesTable`

### FilterBar Props (src/components/FilterBar.js)

| Prop | Type | Description |
|------|------|-------------|
| `recordLabel` | string | Label for the main search field ("PO #", "Order #", "Product Line", etc.) |
| `recordPlaceholder` | string | Placeholder text |
| `recordTooltip` | string | Custom tooltip for the "i" icon next to the label |
| `recordAsOperator` | boolean | Swaps record text input for OperatorSelect dropdown (Security page) |
| `sourceOptions` | array | Options for the Source dropdown |
| `showWarehouse` | boolean | Show Warehouse # input |
| `showCustomer` | boolean | Show Customer # input |
| `showProduct` | boolean | Show Product # input |
| `showVendor` | boolean | Show Vendor # input |
| `showOperator` | boolean | Show Operator ID dropdown |

**Adding a new search field to FilterBar:**
1. Add `show*` prop with default `false`
2. Add input element in the JSX (with `onKeyDown` Enter handler and `InfoTip`)
3. Add the field to `hasFilters` check
4. Add to `useChangeSearch` filter state, search handler, and clear handler
5. Add backend support in `queryVariations` if it's a new WHERE clause
6. Pass `show*={true}` on the page(s) that need it

### ChangesTable States (src/components/ChangesTable.js)

Three states when no data is shown:
- **Before searching:** "Enter search criteria above and click Search."
- **Loading:** Spinning blue wheel with "Querying Data Lake..."
- **No results:** "No changes found" with suggestion to broaden search

Receives `loading` and `hasSearched` props from each page.

### Key Components

| Component | Purpose |
|-----------|---------|
| `ChangesTable.js` | Sortable data table with expandable rows, loading states |
| `ExpandedRow.js` | Expanded detail view showing all field metadata |
| `FilterBar.js` | Search bar with conditional fields, info tooltips |
| `InfoTip.js` | Small "i" icon with hover tooltip — uses `textTransform: 'none'` to override parent uppercase |
| `OperatorSelect.js` | Searchable dropdown fetching from `/api/operators`, client-side cached, filters by code or name |
| `ResultFilters.js` | Column filter dropdowns (client-side post-query filtering) |
| `MultiSelect.js` | Multi-select checkbox dropdown used by ResultFilters |
| `StatsBar.js` | Summary bar showing total records, records affected, changes, counts per source table |
| `PatchNotesModal.js` | Version history modal with sidebar navigation, "NEW" badge via localStorage |
| `UpdateBanner.js` | Polls `/api/version` every 5 min, shows refresh banner when version mismatch detected |
| `Sidebar.js` | Navigation with module list, theme toggle, version display |

### CSV Export

`useChangeSearch` handles export. Values that look like scientific notation (e.g., bin locations containing "E") are wrapped in `="value"` format to prevent Excel misinterpretation.

---

## Service Accounts

| Account | Purpose | Credentials Location |
|---------|---------|---------------------|
| MAUD (SXe operator) | Queries Compass Data Lake and SXe REST APIs. Read-only. | `server/.env` (INFOR_*) |
| MartinAudit@martin.local | LDAP queries for AD group membership. Password never expires. | `server/.env` (AD_*) |

---

## CI/CD — GitHub Actions

### Deploy Workflow (`.github/workflows/deploy.yml`)

Triggers on push to `main`. Self-hosted runner on VM (LOCAL SYSTEM). Steps:
1. `git pull origin main`
2. `npm install` (frontend)
3. `npm install` (server)
4. `npm run build`
5. `iisreset`

### Deploy Commands

```powershell
# Daily work
git checkout dev → edit → test locally → git add/commit/push

# Deploy to production
git checkout main && git merge dev && git push && git checkout dev
```

### Version Management

When releasing: bump `version` in `package.json` AND add entry to top of `src/config/patchNotes.js`. The `CURRENT_VERSION` export auto-reads from the first array entry. UpdateBanner detects the mismatch and prompts users to refresh.

---

## How to Add a New Module

1. **TABLE_CONFIG** in `server/tracked-fields.js` — add entry with recordKey, suffixKey, lineKey, recordKeyType
2. **TRACKED_FIELDS** in `server/tracked-fields.js` — add field definitions with label and desc
3. **FINANCE_FIELDS** in `server/roles.js` — add any cost/pricing fields that should be masked
4. **SENSITIVE_FIELDS** in `server/roles.js` — add any banking/tax fields that should be masked
5. **Create page** in `src/pages/NewModulePage.js` — copy any existing page, change tables/columns/filters
6. **Register module** in `src/config/modules.js` — add entry with id, label, icon, badge, description
7. **Add import + route** in `src/App.js` — import the page, add to PAGE_MAP object
8. If the table has `vendno`/`custno`/`prod` columns, add to the appropriate `TABLES_WITH_*` array in `server/index.js`

## How to Add a New Tracked Field

One line in `server/tracked-fields.js`:
```js
fieldname: { label: 'Display Name', desc: 'Description shown in expanded row' },
```
If it's a cost/pricing field, also add to `FINANCE_FIELDS` in `roles.js`.
If it's a banking/tax field, also add to `SENSITIVE_FIELDS` in `roles.js`.

## How to Add a New Search Filter

1. Add `show*` prop to `FilterBar.js` (default false) with input element, `onKeyDown`, and `InfoTip`
2. Add to `hasFilters` check in FilterBar
3. Add to `useChangeSearch.js` — filter state initial value, search handler (`if (filters.x) searchFilters.x = ...`), clear handler
4. Add to `queryVariations` in `server/index.js` — add WHERE clause, possibly a `TABLES_WITH_*` array
5. Add to route handler destructuring and filters object in `server/index.js`
6. Pass `show*` on the page(s) that need it

---

## Key Technical Decisions

| Decision | Why |
|----------|-----|
| Web app over Electron desktop | Boss wanted compliance checkboxes, web deployment is simpler |
| iisnode over ARR reverse proxy | IIS runs URL Rewrite BEFORE auth, so `{LOGON_USER}` was empty with ARR |
| Server-side field masking | Real values replaced with `●●●●●●` before response. Browser never sees masked data |
| Additive role tiers | Each tier includes everything below it. FINANCE sees everything USERS sees + more |
| ICSL on its own page | Different search keys (prodline vs prod), different users than Prod/Whse |
| Inline enrichment for reps/buyers | Values enriched in new_value/old_value, not new columns — cleaner for these field types |
| 7-day default start date visible in UI | No hidden defaults. User can see and change the date filter |
| `dev`/`main` branch strategy | Auto-deploy on merge to main. Dev is safe to push without affecting production |
| `hasSuffix` flag on each change record | Set from TABLE_CONFIG.suffixKey — controls whether "-0" shows in record column. Products/catalogs show clean, POs/orders show suffix |
| `operinit` auto-uppercased | SXe stores operator codes in uppercase. Users can type lowercase and it works |
| Deactivated operators filtered | Names starting with "X " excluded from operator dropdown |

---

## Common Pitfalls for New AI Sessions

1. **Always clone the `dev` branch**, not main: `git clone -b dev https://github.com/chpatter/martin-audit-web.git`
2. **Don't change `package.json` version** unless the user asks to bump it
3. **The `version` field at the top of `package.json`** is the only one that matters for version checking. Don't change it to "2.0.0" or anything unexpected.
4. **`web.config` and `iisnode.yml`** should almost never be edited. They're IIS config, not app code.
5. **Field descriptions** should match Infor's data dictionary where possible. The user manually verified many of these.
6. **Don't add `binloc` to ICSW** — the correct field names are `binloc1` and `binloc2` (plus `bintype`)
7. **ICSL uses `prodline` as recordKey**, not `prod`. It's a different entity from products.
8. **The Security page has TWO operator fields**: the record field (whose settings to view) and Operator ID (who made the change). Both use the OperatorSelect dropdown.
9. **`allvariations()` is the Compass function** — not a regular SQL table. It returns historical versions, not current data. Regular `SELECT * FROM tablename` returns current data only.
10. **Sales rep table is `smsn`**, not `sastn` or `sastt`. Buyer codes are operator initials, looked up from the operator cache.
11. **Transfer cancellation** shows as WTEL `statustype` changing to `I` (Inactive) or `C` (Canceled) at the line level, and WTEH `stagecd` changing to `9` at the header level. Individual lines can be deactivated without canceling the whole transfer.
12. **CSV export wraps values** that look like scientific notation in `="value"` format to prevent Excel misinterpretation (e.g., bin locations with "E").
13. **`localStorage` is used** for the PatchNotes "NEW" badge (last seen version) — this is fine in the user's own app, not an artifact restriction.

---

## File Reference

### Server Files (server/)

| File | Purpose |
|------|---------|
| `index.js` | Express server — all routes, query builder, sanitization, proxy |
| `tracked-fields.js` | TABLE_CONFIG + TRACKED_FIELDS — 23 tables, ~956 field definitions |
| `roles.js` | RBAC — role definitions, FINANCE_FIELDS, SENSITIVE_FIELDS, maskChanges() |
| `auth-ad.js` | AD middleware — reads iisnode auth header, LDAP group checks, 15-min cache |
| `changes.js` | Change detection — compares consecutive record versions, sets hasSuffix |
| `compass.js` | Compass Data Lake client — submit, poll, fetch (3-step async) |
| `lookups.js` | Name caches — vendors, customers, operators, sales reps. Enrichment functions. |
| `audit-log.js` | Daily JSON audit logs at server/logs/ |
| `.env` | Secrets (INFOR_*, AD_*) — never committed |

### Frontend Files (src/)

| File | Purpose |
|------|---------|
| `App.js` | Main app — routing, header, role filtering, PAGE_MAP, patch notes modal, update banner |
| `config/modules.js` | Module definitions — id, label, icon, badge for sidebar |
| `config/patchNotes.js` | Version history data, CURRENT_VERSION export |
| `config/ThemeContext.js` | Dark/light theme React context |
| `config/theme.js` | Design tokens — colors, fonts, radii, shadows |
| `hooks/useChangeSearch.js` | Shared search hook — all 12 pages consume this |
| `services/api.js` | API client — relative `/api` paths, `credentials: 'include'` |
| `utils/format.js` | Date/time formatting helpers |

### IIS Files (project root)

| File | Purpose |
|------|---------|
| `web.config` | iisnode handler, SPA fallback, static files from build/ |
| `iisnode.yml` | Promotes AUTH_USER, logging settings |

---

## Pending Items

- [ ] VPN access — some SonicWall locations can't reach VM. MSP working on it.
- [ ] Intranet zone GPO — for true SSO (no sign-in prompt)
- [ ] Test Finance/Sensitive roles — only Users and Admin tested
- [ ] Fully migrate to MAUD service account, remove CP01 references from .env
- [ ] Set iisnode.yml loggingEnabled and devErrorsEnabled back to false
- [ ] Search refinement — add more module-specific search fields per the user's list
- [ ] Rotate MartinAudit AD password
