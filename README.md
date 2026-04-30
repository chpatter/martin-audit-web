# ▶ Martin Audit System — Web Edition

**CloudSuite Distribution Audit Log Viewer** — An internal web application that tracks field-level changes across 10 modules in Infor CloudSuite SXe. Built to replace Agile Dragon's Dragon Pack Audit.

Users open a browser, navigate to the server URL, and Windows Authentication handles the rest — no login screen, no credentials to manage.

## Architecture

```
User's Browser                 Company Server (VM / IIS)     Infor CloudSuite
┌────────────────────┐       ┌──────────────────────┐     ┌────────────────┐
│  Browser           │──────▶│  IIS                 │────▶│  Data Lake     │
│  (Edge/Chrome)     │ HTTPS │  ├─ Windows Auth     │     │  (Compass)     │
│                    │       │  ├─ React build/      │     │                │
│  • No install      │       │  └─ Reverse proxy ──▶│     │  • mingle-sso  │
│  • No credentials  │       │     Node.js backend  │     │    (auth)      │
│  • Windows SSO     │       │     (port 3001)      │     │  • mingle-ion  │
│                    │       │                      │     │    (Compass)   │
│                    │       │  • OAuth2 auth       │     │                │
│                    │       │  • AD group checks   │     │                │
│                    │       │  • Compass queries   │     │                │
│                    │       │  • Name enrichment   │     │                │
└────────────────────┘       └──────────────────────┘     └────────────────┘
```

No credentials, no application code, and no Infor access lives on user machines. Everything runs on the server. IIS handles Windows Authentication — the browser sends Kerberos/NTLM credentials automatically, IIS validates them, and passes the verified username to the Node.js backend.

### How It Works

1. **User opens the URL** — browser loads the React app from IIS
2. **IIS authenticates** — Windows Authentication validates the user via Kerberos/NTLM (automatic, no login screen for domain-joined machines)
3. **IIS passes identity** — sets the `X-IIS-WindowsAuthUser` header with the verified Windows username on every proxied request
4. **AD validates access** — the backend checks if that username is in the `Martin-Audit-Users` security group
5. **Backend authenticates to Infor** via OAuth2 service account (grant_type=password)
6. **Queries Compass Data Lake** using `infor.allvariations('tablename')` — returns every historical version of every record
7. **Compares consecutive versions** — for each tracked field, if the value differs between version N and version N+1, that's a change
8. **Enriches results** — looks up vendor names, customer names, and operator names from cached arsc/apsv/sasoo data
9. **Frontend displays** changes in a sortable, filterable table with CSV export

### Why IIS + Windows Auth?

- **No login screen** — domain-joined users are authenticated automatically
- **Verified identity** — IIS validates the Windows user, not a self-reported header
- **Audit compliance** — every request has a verified username for audit trails
- **Security group control** — access managed through existing AD infrastructure
- **HTTPS** — IIS handles TLS certificates

## Modules

| Module | Tables | Tracked Fields | Description |
|--------|--------|---------------|-------------|
| **Catalog** | ICSC | 48 | Product catalog — pricing, descriptions, vendor info, UOM |
| **Customers** | ARSC, ARSS | 45 + 45 | Customer master and ship-to records — address, terms, reps, credit |
| **Orders** | OEEH, OEEL | 65 + 55 | Sales order headers and lines — stage, pricing, quantities, ship-to |
| **Pricing-Customer** | PDSC | 77 | Customer price/discount records — multipliers, qty breaks, contracts |
| **Pricing-Vendor** | PDSV | 44 | Vendor cost agreements and pricing |
| **Prod/Whse** | ICSP, ICSW | 12 + 20 | Product master and warehouse-level settings |
| **Purchases** | POEH, POEL | 33 + 20 | Purchase order headers and lines — stage, dates, costs, quantities |
| **Security** | SASOO, PV_USER, PV_SECURE, AUTHSECURE | 90 + 46 + 3 + 10 | Operator permissions, function security, auth settings |
| **Transfers** | WTEH, WTEL | 9 + 11 | Warehouse transfer headers and lines |
| **Vendors** | APSV, APSS | 63 + 47 | Vendor master and ship-from records — banking, 1099, freight, terms |

### Tracked Fields

Each table has a curated list of fields the app monitors for changes, defined in `server/tracked-fields.js`. Fields were selected by comparing against Agile Dragon's output plus additional fields identified as valuable from the raw Compass data.

Every tracked field includes a human-readable **label** (e.g., "Stage Code") and a **description** explaining what the field means (e.g., "0 = Quoted, 1 = Ordered, 2 = Picked...").

To add a new tracked field, add it to the appropriate table's object in `server/tracked-fields.js`. No other code changes needed — the comparison engine picks it up automatically.

## Quick Start (Development)

### Prerequisites

- Node.js 18+

### 1. Install Dependencies

```bash
cd martin-audit-web

# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Backend

```bash
cd server
copy .env.example .env
```

Edit `server/.env` with your Infor OAuth2 credentials and AD settings. See the Environment Variables section below.

### 3. Run Locally

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd ..
npm start
```

Opens at `http://localhost:3000`. In development, the React proxy forwards `/api` requests to port 3001 automatically.

**Note:** Windows Authentication doesn't apply in local dev — AD checks use the `X-Windows-User` header fallback. Set `AD_ENABLED=false` in `server/.env` for local development.

## Deployment (IIS on Windows Server)

### Prerequisites

Install these on the Windows Server VM:
- **Node.js 18+**
- **IIS** with these features enabled:
  - URL Rewrite Module ([download](https://www.iis.net/downloads/microsoft/url-rewrite))
  - Application Request Routing (ARR) ([download](https://www.iis.net/downloads/microsoft/application-request-routing))
  - Windows Authentication (Server Manager → Add Roles → Web Server → Security → Windows Authentication)
- **PM2** — `npm install -g pm2` — for Node.js process management

### 1. Deploy the Code

```powershell
# Clone the repo on the VM
git clone https://github.com/chpatter/martin-audit-web.git C:\inetpub\martin-audit
cd C:\inetpub\martin-audit

# Install dependencies
npm install
cd server
npm install
cd ..

# Build the React frontend
npm run build

# Copy web.config into the build output
copy web.config build\web.config
```

### 2. Configure the Backend

```powershell
copy server\.env.example server\.env
```

Edit `server\.env`:
```
PORT=3001

# Infor CloudSuite OAuth2
INFOR_TENANT_ID=your_tenant_id
INFOR_SSO_BASE=https://mingle-sso.inforcloudsuite.com
INFOR_ION_BASE=https://mingle-ionapi.inforcloudsuite.com
INFOR_CLIENT_ID=your_client_id
INFOR_CLIENT_SECRET=your_client_secret
INFOR_USERNAME="your_service_account_username"
INFOR_PASSWORD="your_service_account_password"
INFOR_CONO=1
INFOR_OPER=MAUD

# CORS
ALLOWED_ORIGINS=https://audit.martin.local

# Active Directory
AD_ENABLED=true
AD_URL=ldap://16DCFLORENCE.martin.local
AD_BASE_DN=DC=martin,DC=local
AD_USERNAME=MartinAudit@martin.local
AD_PASSWORD=your-ad-service-account-password
AD_ALLOWED_GROUPS=Martin-Audit-Users
```

### 3. Start the Backend with PM2

```powershell
cd server
pm2 start index.js --name martin-audit-api
pm2 save
pm2 startup
```

### 4. Configure IIS

**Enable ARR Proxy:**
1. Open IIS Manager
2. Click the server name (top level)
3. Double-click Application Request Routing Cache
4. Click Server Proxy Settings
5. Check Enable proxy
6. Click Apply

**Allow server variables for reverse proxy:**
1. Open IIS Manager
2. Click the server name
3. Double-click URL Rewrite
4. Click View Server Variables (right panel)
5. Add these three:
   - `HTTP_X_IIS_WINDOWSAUTHUSER`
   - `HTTP_X_FORWARDED_FOR`
   - `HTTP_X_FORWARDED_PROTO`

**Create the IIS site:**
1. Right-click Sites → Add Website
2. Site name: `Martin Audit`
3. Physical path: `C:\inetpub\martin-audit\build`
4. Binding: HTTPS, port 443, hostname `audit.martin.local`
5. SSL certificate: select your internal cert (from AD Certificate Authority)
6. Click OK

**Configure Authentication:**
1. Select the Martin Audit site
2. Double-click Authentication
3. **Disable** Anonymous Authentication
4. **Enable** Windows Authentication

**Add DNS record:**
- In your DNS server, create an A record pointing `audit.martin.local` to the VM's IP address

### 5. Verify

1. Browse to `https://audit.martin.local` from a domain-joined machine
2. You should see the app load with no login screen
3. Check the header bar — it should show your Windows username
4. If you get "Access Denied", add yourself to the `Martin-Audit-Users` AD group

### 6. Updating the App

**Frontend changes:**
```powershell
cd C:\inetpub\martin-audit
git pull
npm run build
copy web.config build\web.config
```

**Backend changes:**
```powershell
cd C:\inetpub\martin-audit
git pull
cd server
pm2 restart martin-audit-api
```

Users get updates on their next browser refresh.

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend port (default: 3001) |
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
| `AD_ENABLED` | No | Enable AD auth (default: `false`) |
| `AD_URL` | When AD enabled | LDAP URL (e.g., `ldap://16DCFLORENCE.martin.local`) |
| `AD_BASE_DN` | When AD enabled | Domain base DN (e.g., `DC=martin,DC=local`) |
| `AD_USERNAME` | When AD enabled | AD service account (e.g., `MartinAudit@martin.local`) |
| `AD_PASSWORD` | When AD enabled | AD service account password |
| `AD_ALLOWED_GROUPS` | When AD enabled | Comma-separated security groups |

## Security

- **IIS Windows Authentication** — Kerberos/NTLM, verified user identity on every request
- **AD security groups** — group-based access control with 15-minute membership cache, fail-closed
- **HTTPS** — IIS handles TLS; all traffic encrypted
- **Helmet** — HTTP security headers (X-Frame-Options, HSTS, etc.)
- **Rate limiting** — 100 requests per minute per IP
- **Input sanitization** — all user inputs sanitized before Compass SQL queries
- **Error sanitization** — internal errors logged server-side, never sent to clients
- **CORS restriction** — only configured origins can call the backend
- **SXe proxy whitelisting** — only approved endpoint paths are proxied
- **Credential isolation** — all secrets in `server/.env` on the VM, never in client code

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server status — uptime and auth state |
| `GET` | `/api/auth/status` | Infor connection status — operator, cono, Windows user |
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
├── public/
│   ├── index.html           # HTML shell
│   └── triangle.svg         # Martin red triangle logo
├── src/
│   ├── components/
│   │   ├── ChangesTable.js  # Sortable data table with expandable rows
│   │   ├── ExpandedRow.js   # Expanded row detail view
│   │   ├── FilterBar.js     # Search bar — record #, source, warehouse, dates
│   │   ├── MultiSelect.js   # Multi-select dropdown for column filters
│   │   ├── PODetail.js      # PO detail drawer with timeline and costing tabs
│   │   ├── ResultFilters.js # Column filter dropdowns (post-search, client-side)
│   │   ├── Sidebar.js       # Navigation sidebar with module list and theme toggle
│   │   ├── StatsBar.js      # Summary bar showing change counts by source table
│   │   └── UI.js            # Shared primitives (Badge, GlowDot, StageBadge)
│   ├── config/
│   │   ├── ThemeContext.js  # React context for dark/light theme
│   │   ├── modules.js       # Module definitions (10 modules)
│   │   └── theme.js         # Design tokens — colors, fonts, radii, shadows
│   ├── hooks/
│   │   └── useChangeSearch.js # Shared hook — search, filter, sort, CSV export
│   ├── pages/
│   │   ├── CatalogPage.js   # ICSC catalog changes
│   │   ├── CustomersPage.js # ARSC + ARSS customer changes
│   │   ├── LoginPage.js     # Auto-connect with AD denial handling
│   │   ├── OrdersPage.js    # OEEH + OEEL order changes
│   │   ├── PricingCustPage.js # PDSC customer pricing changes
│   │   ├── PricingVendPage.js # PDSV vendor pricing changes
│   │   ├── ProdWhsePage.js  # ICSP + ICSW product/warehouse changes
│   │   ├── PurchasesPage.js # POEH + POEL purchase order changes
│   │   ├── SecurityPage.js  # SASOO + PV_USER + PV_SECURE + AUTHSECURE
│   │   ├── TransfersPage.js # WTEH + WTEL warehouse transfer changes
│   │   └── VendorsPage.js   # APSV + APSS vendor changes
│   ├── services/
│   │   └── api.js           # API client — relative /api paths, IIS handles auth
│   ├── utils/
│   │   └── format.js        # Date/time formatting helpers
│   ├── App.js               # Main app — dashboard, routing, header
│   └── index.js             # React entry point, ThemeProvider wrapper
├── server/
│   ├── index.js             # Express server — auth, queries, rate limiting, proxy
│   ├── auth-ad.js           # AD middleware — reads IIS Windows Auth header, LDAP group checks
│   ├── changes.js           # Change detection engine — compares record versions
│   ├── compass.js           # Compass Data Lake client — submit, poll, fetch
│   ├── lookups.js           # Name enrichment — caches vendor/customer/operator names
│   ├── tracked-fields.js    # Field registry — 19 tables, 763 tracked fields
│   ├── package.json         # Backend dependencies
│   └── .env.example         # Backend environment template
├── web.config               # IIS config — Windows Auth, SPA fallback, API reverse proxy
├── .env.example             # Frontend environment template (dev only)
├── .gitignore               # Ignores .env, node_modules, build
├── package.json             # Frontend dependencies and scripts
└── README.md
```

## Scripts

| Script | What It Does |
|--------|-------------|
| `npm start` | React dev server at localhost:3000 |
| `npm run build` | Build React for production (output in `build/`) |
| `npm test` | Run tests |

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 18 | UI framework |
| Styling | Inline styles + theme tokens | Dark/light mode, no CSS build step |
| Backend | Express.js | API server |
| Web Server | IIS | Static files, Windows Auth, reverse proxy, HTTPS |
| Security | helmet, express-rate-limit, input sanitization | Server hardening |
| Auth (Infor) | OAuth2 service account (grant_type=password) | Compass and SXe API access |
| Auth (Users) | IIS Windows Authentication + AD LDAP | Kerberos/NTLM SSO with security group control |
| Data | Compass Data Lake (allvariations) | Historical record versions across 19 tables |
| Enrichment | Cached ARSC, APSV, SASOO lookups | Vendor/customer/operator display names |

## Credential Rotation

**Infor:** Regenerate OAuth2 credentials in ION API portal, update `server/.env`, run `pm2 restart martin-audit-api`.

**Active Directory:** Reset the AD service account password, update `server/.env`, run `pm2 restart martin-audit-api`.

---

*Built to replace Dragon Pack Audit — because you shouldn't have to pay twice for features you already had.*
