# Martin Audit System — Project Context

Paste this at the start of a new AI chat to continue working on the project.

## What It Is
Internal web app for Martin Supply replacing Agile Dragon's Dragon Pack Audit. Tracks field-level changes across Infor CloudSuite SXe by querying Compass Data Lake's `allvariations()` function, comparing consecutive record versions to detect what changed, when, and by whom.

## Repos
- **Company (production):** https://github.com/MartinSupply/martin-audit-web
- **Personal (backup):** https://github.com/chpatter/martin-audit-web
- Both push simultaneously. `dev` branch for work, `main` for production.

## Production
- **URL:** https://audit.martinsupply.com
- **Server:** 25MARTINAPP01 (Windows Server VM), IP 10.100.1.148
- **App Path:** C:\inetpub\martin-audit-app
- **IIS Site:** Martin Audit, port 443, HTTPS with internal wildcard cert
- **Auth:** IIS Windows Auth (Kerberos+NTLM) → iisnode → Node.js/Express
- **CI/CD:** GitHub Actions with self-hosted runner on VM. Merge to `main` auto-deploys.

## Architecture
Browser → IIS (Windows Auth/Kerberos, static files from build/) → iisnode → Node.js/Express → Infor Compass Data Lake + SXe REST APIs. No PM2, no ARR, no separate port. iisnode runs Node.js inside IIS after auth completes, providing username via `x-iisnode-auth_user` header. `iisnode.yml` promotes `AUTH_USER`.

## Tech Stack
React 18 frontend, Express.js backend, iisnode process host, IIS web server, helmet + express-rate-limit security, OAuth2 grant_type=password for Infor, AD LDAP for user auth, Compass Data Lake allvariations() for data.

## Modules (11 total, 22 tables, 893 tracked fields)
| Module | Tables | Fields |
|--------|--------|--------|
| Catalog | ICSC | 50 |
| Customers | ARSC, ARSS | 45+45 |
| Inventory | ICET, ICSEP, ICSET | 34+31+23 |
| Orders | OEEH, OEEL | 65+55 |
| Pricing-Customer | PDSC | 77 |
| Pricing-Vendor | PDSV | 44 |
| Prod/Whse | ICSP, ICSW | 16+23 |
| Purchases | POEH, POEL | 33+23 |
| Security | SASOO, PV_USER, PV_SECURE, AUTHSECURE | 90+46+3+10 |
| Transfers | WTEH, WTEL | 24+46 |
| Vendors | APSV, APSS | 63+47 |

## RBAC — 4-Tier Role-Based Access
AD security groups (on-prem, created in ADUC — cloud-only Entra groups don't work with LDAP):
- **Martin-Audit-Users** — 10 modules (no Security), operational fields only, pricing/cost/banking masked as `●●●●●●`
- **Martin-Audit-Finance** — + pricing, costs, margins, credit limits visible
- **Martin-Audit-Sensitive** — + bank accounts, routing numbers, tax IDs, 1099 info visible
- **Martin-Audit-Admin** — All 11 modules, everything unmasked

Masking is server-side in `server/roles.js` via `maskChanges()`. Masked data never reaches browser.

## Service Accounts
- **MAUD** (SXe operator) — read-only Compass + SXe API access. Credentials in `server/.env` (INFOR_*)
- **MartinAudit@martin.local** — AD service account for LDAP group lookups. Credentials in `server/.env` (AD_*)

## Key Files
- `server/tracked-fields.js` — all 22 tables, 893 field definitions with labels and descriptions
- `server/roles.js` — RBAC definitions, FINANCE_FIELDS, SENSITIVE_FIELDS, maskChanges(), filterTablesByRole()
- `server/auth-ad.js` — reads `x-iisnode-auth_user`, checks AD group membership, 15-min cache
- `server/audit-log.js` — daily JSON audit logs of all user activity at server/logs/
- `server/changes.js` — comparison engine, `hasSuffix` flag for display
- `server/compass.js` — Compass Data Lake client (submit, poll, fetch)
- `server/lookups.js` — caches vendor/customer/operator names from arsc/apsv/sasoo
- `server/index.js` — Express server with all endpoints
- `web.config` — iisnode handler, SPA fallback, static file routing from build/
- `iisnode.yml` — promotes AUTH_USER server variable
- `src/services/api.js` — relative `/api` paths, `credentials: 'include'`
- `src/hooks/useChangeSearch.js` — shared hook all 11 pages consume
- `src/components/ChangesTable.js` — `hasSuffix` flag controls suffix display
- `src/components/PatchNotesModal.js` — version history modal with sidebar nav
- `src/components/UpdateBanner.js` — polls /api/version, shows refresh banner
- `src/config/patchNotes.js` — version history data, CURRENT_VERSION export
- `.github/workflows/deploy.yml` — auto-deploy on push to main
- `VM-Operations-Guide.md` — cheat sheet for VM operations

## Deploy Workflow
```
# Daily work on dev branch
git checkout dev
# edit, test locally with npm start
git add . && git commit -m "message" && git push

# Deploy to production
git checkout main && git merge dev && git push && git checkout dev
# GitHub Actions auto: git pull → npm install → npm run build → iisreset
```

## Version Management
When releasing: bump `version` in `package.json` AND add entry to top of `src/config/patchNotes.js`. UpdateBanner auto-detects version mismatch and prompts users to refresh.

## Pending Items
- [ ] Fully migrate to MAUD service account, remove CP01 references
- [ ] Set iisnode.yml loggingEnabled and devErrorsEnabled back to false
