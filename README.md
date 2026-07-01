# ▶ Martin Audit System

**CloudSuite Distribution Audit Log Viewer** — An internal web application that tracks field-level changes across 12 modules in Infor CloudSuite SXe. Built to replace Agile Dragon's Dragon Pack Audit.

Users browse to `https://audit.martinsupply.com` and Windows SSO handles the rest — no login screen, no credentials, no installs.

## Architecture

```
User's Browser                 Company Server (25MARTINAPP01)     Infor CloudSuite
┌────────────────────┐       ┌───────────────────────────┐     ┌────────────────┐
│  Browser           │──────▶│  IIS                      │────▶│  Data Lake     │
│  (Edge/Chrome)     │ HTTPS │  ├─ Windows Auth (SSO)    │     │  (Compass)     │
│                    │       │  ├─ Static files (build/)  │     │                │
│  • No install      │       │  └─ iisnode ──▶ Node.js   │     │  • mingle-sso  │
│  • No credentials  │       │                           │     │    (auth)      │
│  • Windows SSO     │       │  • OAuth2 → Infor         │     │  • mingle-ion  │
│                    │       │  • AD group → role check   │     │    (Compass)   │
│                    │       │  • Field masking by role   │     │                │
│                    │       │  • Compass queries         │     │                │
└────────────────────┘       └───────────────────────────┘     └────────────────┘
```

IIS handles authentication via Kerberos/NTLM, serves the React frontend as static files, and routes API requests to Node.js via iisnode. Node.js runs inside the IIS process — no separate port, no PM2, no reverse proxy.

### How It Works

1. **User opens the URL** — browser loads the React app from IIS
2. **IIS authenticates** — Windows Auth validates the user via Kerberos/NTLM (automatic SSO on domain-joined machines)
3. **iisnode passes identity** — the verified `AUTH_USER` is promoted to a request header that Node.js reads
4. **AD validates access** — the backend checks which AD security groups the user belongs to and assigns a role tier
5. **Role-based field masking** — sensitive fields (pricing, banking, tax IDs) are replaced with `●●●●●●` server-side based on the user's role. Masked data never reaches the browser.
6. **Backend authenticates to Infor** via OAuth2 service account (grant_type=password)
7. **Queries Compass Data Lake** using `infor.allvariations('tablename')` — returns every historical version of every record
8. **Compares consecutive versions** — for each tracked field, if the value differs between version N and version N+1, that's a change
9. **Enriches results** — looks up vendor names, customer names, and operator names from cached arsc/apsv/sasoo data
10. **Frontend displays** changes in a sortable, filterable table with CSV export

## Modules

| Module | Tables | Tracked Fields | Description |
|--------|--------|---------------|-------------|
| **Catalog** | ICSC | 50 | Product catalog — pricing, descriptions, vendor info, UOM |
| **Customers** | ARSC, ARSS | 45 + 45 | Customer master and ship-to records — address, terms, reps, credit |
| **Inventory** | ICET, ICSEP, ICSET | 34 + 31 + 23 | Transactions, cycle counts, adjustments, count tickets |
| **Orders** | OEEH, OEEL | 66 + 56 | Sales order headers and lines — stage, pricing, quantities, ship-to |
| **Pricing-Customer** | PDSC | 77 | Customer price/discount records — multipliers, qty breaks, contracts |
| **Pricing-Vendor** | PDSV | 44 | Vendor cost agreements and pricing |
| **Prod/Whse** | ICSP, ICSW | 16 + 28 | Product master and warehouse-level settings, bin locations, lead times |
| **Prod Line** | ICSL | 56 | Product line setup — buyers, vendors, ordering parameters, discounts |
| **Purchases** | POEH, POEL | 34 + 23 | Purchase order headers and lines — stage, dates, costs, quantities |
| **Security** | SASOO, PV_USER, PV_SECURE, AUTHSECURE | 90 + 46 + 3 + 10 | Operator permissions, function security (Admin only) |
| **Transfers** | WTEH, WTEL | 24 + 46 | Warehouse transfer headers and lines — stage, dates, quantities, bin locations |
| **Vendors** | APSV, APSS | 63 + 47 | Vendor master and ship-from records — banking, 1099, freight, terms |

### Tracked Fields

Each table has a curated list of fields the app monitors for changes, defined in `server/tracked-fields.js`. To add a new tracked field, add it to the appropriate table's object — the comparison engine picks it up automatically. No other code changes needed.

## Role-Based Access Control

Access is controlled by AD security groups. Users get the highest role from all groups they belong to. Each tier includes everything below it.

| AD Group | Role | Modules | Fields Visible |
|----------|------|---------|---------------|
| Martin-Audit-Users | USERS | 11 (no Security) | Operational — dates, stages, addresses, quantities, names, reps, warehouses |
| Martin-Audit-Finance | FINANCE | 11 (no Security) | + pricing, costs, margins, credit limits, discounts, rebates |
| Martin-Audit-Sensitive | SENSITIVE | 11 (no Security) | + bank accounts, routing numbers, tax IDs, 1099 info |
| Martin-Audit-Admin | ADMIN | All 12 | Everything unmasked, including Security module |

Masking is server-side — masked field values are replaced with `●●●●●●` before the response is sent. The real data never reaches the browser. There is nothing to unredact on the client side.

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+

### 1. Install Dependencies

```powershell
cd martin-audit-web
npm install
cd server
npm install
cd ..
```

### 2. Configure Backend

```powershell
copy server\.env.example server\.env
notepad server\.env
```

Fill in your Infor OAuth2 credentials. Set `AD_ENABLED=false` for local development.

### 3. Run Locally

```powershell
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd ..
npm start
```

Opens at `http://localhost:3000`. The React proxy forwards `/api` requests to port 3001 automatically.

## Production Deployment (IIS + iisnode)

### Server Info

- **Server:** 25MARTINAPP01
- **URL:** https://audit.martinsupply.com
- **App Path:** C:\inetpub\martin-audit-app
- **IIS Site:** Martin Audit (port 443, HTTPS)
- **GitHub:** https://github.com/MartinSupply/martin-audit-web

### Prerequisites

Install on the Windows Server VM:
- **Node.js 18+** — https://nodejs.org
- **Git** — https://git-scm.com/download/win
- **IIS** with Windows Authentication enabled
- **URL Rewrite Module** — https://www.iis.net/downloads/microsoft/url-rewrite
- **iisnode** — https://github.com/azure/iisnode/releases (x64 MSI)

ARR (Application Request Routing) and PM2 are NOT needed.

### 1. Deploy the Code

```powershell
git clone https://github.com/MartinSupply/martin-audit-web.git C:\inetpub\martin-audit-app
cd C:\inetpub\martin-audit-app
npm install
cd server
npm install
cd ..
npm run build
```

No `copy web.config` step needed — `web.config` lives at the project root.

### 2. Configure the Backend

```powershell
copy server\.env.example server\.env
notepad server\.env
```

### 3. Configure IIS

**Unlock handlers (one-time, Admin PowerShell):**
```powershell
C:\Windows\System32\inetsrv\appcmd.exe unlock config -section:system.webServer/handlers
```

**Create the IIS site:**
1. Open IIS Manager (`C:\Windows\System32\inetsrv\InetMgr.exe`)
2. Right-click Sites → Add Website
3. Site name: `Martin Audit`
4. Physical path: `C:\inetpub\martin-audit-app` (project root, NOT build/)
5. Binding: HTTPS, port 443, hostname `audit.martinsupply.com`, select SSL certificate
6. Click OK

**Configure Authentication:**
1. Select the Martin Audit site
2. Double-click Authentication
3. **Disable** Anonymous Authentication
4. **Enable** Windows Authentication

**Set folder permissions:**
```powershell
icacls "C:\inetpub\martin-audit-app" /grant "IIS AppPool\Martin Audit:(OI)(CI)M" /T
icacls "C:\inetpub\martin-audit-app" /grant "NETWORK SERVICE:(OI)(CI)M" /T
```

**Git safe directory (required for GitHub Actions runner):**
```powershell
git config --system --add safe.directory C:/inetpub/martin-audit-app
```

**Enable loopback auth (for testing from the VM itself):**
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "BackConnectionHostNames" -Value "audit.martinsupply.com" -PropertyType MultiString -Force
```

**Restart IIS:**
```powershell
iisreset
```

### 4. DNS and SSL

Managed by the infrastructure team:
- **DNS A record:** `audit.martinsupply.com` → VM IP (10.100.1.148)
- **SSL certificate:** Internal wildcard cert bound to the IIS site on port 443

### 5. SSO (No Sign-in Prompt)

Domain-joined machines auto-send Windows credentials when the site is in the Local Intranet zone. Push via Group Policy:
- **GPO path:** Computer Configuration → Administrative Templates → Microsoft Edge → HTTP Authentication → Auth Server Allowlist
- **Value:** `https://audit.martinsupply.com`

Without the GPO, users get a one-time Windows login prompt (which works, just not seamless).

## CI/CD — GitHub Actions Auto-Deploy

Deployments are automated via GitHub Actions with a self-hosted runner on the VM.

### Branch Strategy

- **`dev`** — daily work branch. Push freely, test locally. Nothing happens on the VM.
- **`main`** — production branch. When `dev` is merged into `main`, GitHub Actions auto-deploys to the VM.

### Development Workflow

```
Your PC (dev branch)           GitHub                    VM (auto-deploy)
┌──────────────────┐        ┌──────────────┐         ┌──────────────────┐
│ Edit code        │──push─▶│  dev branch  │         │                  │
│ Test locally     │        │  (no deploy) │         │                  │
│ npm start        │        │              │         │                  │
└──────────────────┘        │              │         │                  │
                            │              │         │                  │
   When ready:              │              │         │                  │
   git checkout main        │              │         │                  │
   git merge dev    ──push─▶│  main branch │──auto──▶│  git pull        │
   git push                 │              │  deploy │  npm run build   │
   git checkout dev         │              │         │  iisreset        │
                            └──────────────┘         └──────────────────┘
```

### Deploy Commands

```powershell
# Push daily work (no deploy)
git checkout dev
git add .
git commit -m "description of changes"
git push

# Deploy to production
git checkout main
git merge dev
git push
git checkout dev
```

### What the Workflow Does (`.github/workflows/deploy.yml`)

1. Triggers on push to `main`
2. Runs on the self-hosted runner (installed on 25MARTINAPP01)
3. `git pull origin main` — pulls latest code
4. `npm install` — installs any new frontend dependencies
5. `npm install` (server) — installs any new backend dependencies
6. `npm run build` — builds the React frontend
7. `iisreset` — restarts IIS and Node.js

### Self-Hosted Runner

Installed at `C:\actions-runner` on the VM. Runs as a Windows service under LOCAL SYSTEM so it has admin rights for `iisreset`. The runner connects to `https://github.com/MartinSupply/martin-audit-web` and listens for workflow triggers.

### Dual Push (Company + Personal Repo)

Git is configured to push to both repos simultaneously:
- **Company:** `https://github.com/MartinSupply/martin-audit-web` (production, has the runner)
- **Personal:** `https://github.com/chpatter/martin-audit-web` (portfolio backup)

```powershell
git remote -v
# origin  https://github.com/MartinSupply/martin-audit-web.git (fetch)
# origin  https://github.com/MartinSupply/martin-audit-web.git (push)
# origin  https://github.com/chpatter/martin-audit-web.git (push)
```

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `INFOR_TENANT_ID` | Yes | Infor CloudSuite tenant identifier |
| `INFOR_SSO_BASE` | Yes | Infor SSO auth URL |
| `INFOR_ION_BASE` | Yes | Infor ION API base URL |
| `INFOR_CLIENT_ID` | Yes | OAuth2 client ID from ION API |
| `INFOR_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `INFOR_USERNAME` | Yes | Service account username |
| `INFOR_PASSWORD` | Yes | Service account password |
| `INFOR_CONO` | No | Company number (default: 1) |
| `INFOR_OPER` | Yes | SXe operator code (e.g., `MAUD`) |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (default: `http://localhost:3000`) |
| `AD_ENABLED` | No | Enable AD auth (default: `false` — all users get Admin) |
| `AD_URL` | When AD enabled | LDAP URL (e.g., `ldap://16DCFLORENCE.martin.local`) |
| `AD_BASE_DN` | When AD enabled | Domain base DN (e.g., `DC=martin,DC=local`) |
| `AD_USERNAME` | When AD enabled | AD service account (e.g., `MartinAudit@martin.local`) |
| `AD_PASSWORD` | When AD enabled | AD service account password |
| `AD_GROUP_USERS` | When AD enabled | AD group for Users role |
| `AD_GROUP_FINANCE` | When AD enabled | AD group for Finance role |
| `AD_GROUP_SENSITIVE` | When AD enabled | AD group for Sensitive role |
| `AD_GROUP_ADMIN` | When AD enabled | AD group for Admin role |

## Security

- **IIS Windows Authentication** — Kerberos/NTLM SSO, verified user identity on every request
- **iisnode** — Node.js runs inside IIS, auth is completed before code executes
- **Role-based field masking** — sensitive values replaced server-side based on AD group membership
- **AD security groups** — four-tier access control with 15-minute membership cache, fail-closed
- **Audit logging** — every search, lookup, and access is logged with verified username, role, query details, and timestamp
- **HTTPS** — IIS handles TLS via internal wildcard certificate
- **Helmet** — HTTP security headers (X-Frame-Options, CSP, HSTS, etc.)
- **Rate limiting** — 100 requests per minute per IP
- **Input sanitization** — all user inputs sanitized before Compass SQL queries
- **Error sanitization** — internal errors logged server-side, never sent to clients
- **SXe proxy whitelisting** — only approved endpoint paths are proxied
- **Credential isolation** — all secrets in `server/.env` on the VM, never in client code
- **CI/CD isolation** — GitHub Actions runner runs as LOCAL SYSTEM, no personal credentials tied to deployments

## Audit Log

Every user action is logged to daily JSON-lines files at `server/logs/audit-YYYY-MM-DD.log`. Each line records who did what and when:

```json
{"timestamp":"2026-05-19T14:23:01.000Z","user":"chpatter","role":"USERS","action":"search","details":{"tables":["oeeh","oeel"],"pono":"10289159"},"resultCount":47}
```

**What's logged:**
- Every search — user, role, tables queried, all search filters, result count
- Every PO lookup — user, PO number
- Every recent changes view — user, date range
- Every login/access — user, role assigned

**What's NOT logged:** the actual data returned — only query parameters and result count.

**Reviewing logs on the VM:**
```powershell
# Today's log
type C:\inetpub\martin-audit-app\server\logs\audit-2026-06-10.log

# Search for a specific user
findstr "chpatter" C:\inetpub\martin-audit-app\server\logs\audit-2026-06-10.log

# Search for all searches across all dates
findstr "search" C:\inetpub\martin-audit-app\server\logs\audit-*.log
```

Log files rotate daily and are gitignored. They persist on the VM until manually deleted.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server status — uptime and auth state |
| `GET` | `/api/auth/status` | Connection status — operator, Windows user, role |
| `POST` | `/api/auth/reconnect` | Force re-authentication to Infor |
| `GET` | `/api/changes/po/:pono` | All POEH + POEL changes for a specific PO |
| `GET` | `/api/changes/recent` | Recent changes (default: last 7 days) |
| `POST` | `/api/changes/search` | Full filter search across any module |
| `POST` | `/api/changes/cancel` | Cancel an in-progress Compass query |
| `POST` | `/api/sxe/*` | Proxy to SXe REST APIs (whitelisted paths only) |

### Search Parameters (`POST /api/changes/search`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `pono` | string | Single record number |
| `posuf` | string | Record suffix |
| `ponos` | array | Multiple records |
| `fromDate` | string | Start date (YYYY-MM-DD) |
| `toDate` | string | End date (YYYY-MM-DD) |
| `whse` | string | Single warehouse filter |
| `whses` | array | Multiple warehouses |
| `vendno` | string | Vendor number filter |
| `custno` | string | Customer number filter |
| `prod` | string | Product number filter |
| `limit` | number | Max records to return |
| `source` | string | Single table to query |
| `tables` | array | Multiple tables to query |
| `includeNew` | boolean | Include initial record creation entries (default: true) |

## How to Add a New Module

1. **Add table config** in `server/tracked-fields.js`:
   ```js
   tablename: { recordKey: 'keyfield', suffixKey: null, lineKey: null, recordKeyType: 'number' }
   ```

2. **Add tracked fields** in `server/tracked-fields.js`:
   ```js
   tablename: {
     fieldname: { label: 'Human Label', desc: 'What this field means' },
   }
   ```

3. **Create a page** in `src/pages/NewModulePage.js` — copy any existing page as a template.

4. **Register the module** in `src/config/modules.js`.

5. **Add the import and route** in `src/App.js` — add to imports and `PAGE_MAP`.

## Project Structure

```
martin-audit-web/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions auto-deploy on push to main
├── public/
│   ├── index.html           # HTML shell
│   └── triangle.svg         # Martin red triangle logo
├── src/
│   ├── components/
│   │   ├── ChangesTable.js  # Sortable data table with expandable rows
│   │   ├── ExpandedRow.js   # Expanded row detail view
│   │   ├── FilterBar.js     # Search bar — record #, source, warehouse, dates, operator
│   │   ├── InfoTip.js       # Hover tooltip "i" icon for search field descriptions
│   │   ├── MultiSelect.js   # Multi-select dropdown for column filters
│   │   ├── OperatorSelect.js # Searchable operator dropdown with name lookup
│   │   ├── PODetail.js      # PO detail drawer
│   │   ├── ResultFilters.js # Column filter dropdowns (client-side)
│   │   ├── Sidebar.js       # Navigation sidebar with module list and theme toggle
│   │   ├── StatsBar.js      # Summary bar showing change counts by source table
│   │   └── UI.js            # Shared primitives (Badge, GlowDot, StageBadge)
│   ├── config/
│   │   ├── ThemeContext.js  # React context for dark/light theme
│   │   ├── modules.js       # Module definitions (12 modules)
│   │   └── theme.js         # Design tokens — colors, fonts, radii, shadows
│   ├── hooks/
│   │   └── useChangeSearch.js # Shared hook — search, filter, sort, CSV export
│   ├── pages/
│   │   ├── CatalogPage.js   # ICSC catalog changes
│   │   ├── CustomersPage.js # ARSC + ARSS customer changes
│   │   ├── InventoryPage.js # ICET + ICSEP + ICSET inventory transactions and counts
│   │   ├── LoginPage.js     # Auto-connect with AD denial handling
│   │   ├── OrdersPage.js    # OEEH + OEEL order changes
│   │   ├── PricingCustPage.js # PDSC customer pricing changes
│   │   ├── PricingVendPage.js # PDSV vendor pricing changes
│   │   ├── ProdWhsePage.js  # ICSP + ICSW product/warehouse changes
│   │   ├── ProdLinePage.js  # ICSL product line setup changes
│   │   ├── PurchasesPage.js # POEH + POEL purchase order changes
│   │   ├── SecurityPage.js  # SASOO + PV_USER + PV_SECURE + AUTHSECURE (Admin only)
│   │   ├── TransfersPage.js # WTEH + WTEL warehouse transfer changes
│   │   └── VendorsPage.js   # APSV + APSS vendor changes
│   ├── services/
│   │   └── api.js           # API client — relative /api paths
│   ├── utils/
│   │   └── format.js        # Date/time formatting helpers
│   ├── App.js               # Main app — dashboard, routing, header, role filtering
│   └── index.js             # React entry point, ThemeProvider wrapper
├── server/
│   ├── index.js             # Express server — auth, queries, rate limiting, proxy
│   ├── audit-log.js         # Audit logger — daily JSON log of all user activity
│   ├── auth-ad.js           # AD middleware — reads iisnode auth header, LDAP group checks
│   ├── changes.js           # Change detection engine — compares record versions
│   ├── compass.js           # Compass Data Lake client — submit, poll, fetch
│   ├── lookups.js           # Name enrichment — caches vendor/customer/operator names
│   ├── roles.js             # RBAC — role definitions, field masking rules, table filtering
│   ├── tracked-fields.js    # Field registry — 23 tables, 956 tracked fields
│   ├── logs/                # Audit logs (gitignored, auto-created)
│   ├── package.json         # Backend dependencies
│   └── .env.example         # Backend environment template
├── web.config               # IIS config — iisnode handler, SPA routing, static files
├── iisnode.yml              # iisnode settings — promotes AUTH_USER to Node.js
├── .gitignore               # Ignores .env, node_modules, build, iisnode logs
├── package.json             # Frontend dependencies and scripts
├── VM-Operations-Guide.md   # Cheat sheet for VM administration
└── README.md
```

## Service Accounts

| Account | Purpose | Credentials Location |
|---------|---------|---------------------|
| MAUD (SXe operator) | Queries Compass Data Lake and SXe REST APIs. Read-only. | `server/.env` (INFOR_*) |
| MartinAudit@martin.local | LDAP queries to check AD group membership. Default domain read access. | `server/.env` (AD_*) |

## Credential Rotation

**Infor:** Regenerate OAuth2 credentials in ION API portal, update `server/.env`, push to main (auto-deploys with `iisreset`).

**Active Directory:** Reset the MartinAudit password in ADUC, update `server/.env` directly on the VM, run `iisreset`.

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 18 | UI framework |
| Styling | Inline styles + theme tokens | Dark/light mode |
| Backend | Express.js | API server |
| Process Host | iisnode | Runs Node.js inside IIS — no separate port or process manager |
| Web Server | IIS | Static files, Windows Auth, HTTPS |
| Security | helmet, express-rate-limit, input sanitization | Server hardening |
| Auth (Infor) | OAuth2 service account (grant_type=password) | Compass and SXe API access |
| Auth (Users) | IIS Windows Authentication + AD LDAP | Kerberos/NTLM SSO with role-based access |
| Access Control | RBAC with 4 tiers | Field-level masking by AD group membership |
| Data | Compass Data Lake (allvariations) | Historical record versions across 23 tables |
| Enrichment | Cached ARSC, APSV, SASOO lookups | Vendor/customer/operator display names |
| CI/CD | GitHub Actions + self-hosted runner | Auto-deploy on merge to main |

---

*Built to replace Dragon Pack Audit — because you shouldn't have to pay twice for features you already had.*
