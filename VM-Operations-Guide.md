# Martin Audit System — VM Operations Guide

**Server:** 25MARTINAPP01
**URL:** https://audit.martinsupply.com
**App Path:** C:\inetpub\martin-audit-app
**Backend Config:** C:\inetpub\martin-audit-app\server\.env
**IIS Site:** Martin Audit (port 443, HTTPS)
**Node.js:** Managed by iisnode (inside IIS, no separate process)
**GitHub:** https://github.com/MartinSupply/martin-audit-web
**Auto-Deploy:** GitHub Actions → self-hosted runner on this VM

---

## Deploying Updates

### Automatic (standard workflow)

Merge to `main` and push — GitHub Actions handles the rest:

```powershell
# On your local machine
git checkout main
git merge dev
git push
git checkout dev
```

The workflow pulls code, installs deps, builds frontend, and restarts IIS automatically.

### Manual (backup / emergency)

If the runner is down or you need to deploy directly:

```powershell
cd C:\inetpub\martin-audit-app
git pull origin main
npm install
cd server
npm install
cd ..
npm run build
iisreset
```

### Backend-only hotfix

```powershell
cd C:\inetpub\martin-audit-app
git pull origin main
iisreset
```

---

## Common Commands

| Task | Command |
|------|---------|
| Deploy to production | Merge `dev` → `main`, push (auto-deploys) |
| Manual deploy | `git pull`, `npm run build`, `iisreset` |
| Restart Node.js | `iisreset` |
| Check backend health | Browse to `https://audit.martinsupply.com/api/health` |
| Check user auth/role | Browse to `https://audit.martinsupply.com/api/auth/status` |
| Edit backend config | `notepad C:\inetpub\martin-audit-app\server\.env` |
| Clear AD role cache | `iisreset` (cache resets on restart) |
| Review today's audit log | `type C:\inetpub\martin-audit-app\server\logs\audit-YYYY-MM-DD.log` |
| Search audit log by user | `findstr "username" C:\inetpub\martin-audit-app\server\logs\audit-*.log` |
| Check IIS site status | `C:\Windows\System32\inetsrv\appcmd.exe list site "Martin Audit"` |
| Open IIS Manager | `C:\Windows\System32\inetsrv\InetMgr.exe` |
| Check runner status | `Get-Service | Where-Object { $_.Name -like '*actions*' }` |
| Check deploy history | `https://github.com/MartinSupply/martin-audit-web/actions` |
| Check Node.js version | `node --version` |

---

## Troubleshooting

### App Won't Load

1. Check the backend health directly:
   ```
   https://audit.martinsupply.com/api/health
   ```
   Should return JSON with `"status":"ok"` and `"authenticated":true`

2. If health fails, restart IIS:
   ```powershell
   iisreset
   ```

3. Check IIS site is running:
   ```powershell
   C:\Windows\System32\inetsrv\appcmd.exe list site "Martin Audit"
   ```
   Should show `state:Started`

4. Check .env file exists and has credentials:
   ```powershell
   type C:\inetpub\martin-audit-app\server\.env | findstr INFOR_TENANT
   ```

### Node.js Errors

Enable iisnode debug logging temporarily:
```powershell
notepad C:\inetpub\martin-audit-app\iisnode.yml
```
Change `loggingEnabled: false` to `loggingEnabled: true` and `devErrorsEnabled: false` to `devErrorsEnabled: true`. Run `iisreset`.

Browse to the app — errors show detailed info. Check iisnode logs:
```powershell
dir C:\inetpub\martin-audit-app\iisnode\
type C:\inetpub\martin-audit-app\iisnode\*.log
```

**Set logging back to false after debugging.**

### Infor Connection Failed

```powershell
notepad C:\inetpub\martin-audit-app\server\.env
iisreset
```

Browse to `https://audit.martinsupply.com/api/health` — check `"authenticated"` field.

### User Gets "Access Denied"

1. Verify they're in an AD security group:
   ```powershell
   Get-ADGroupMember "Martin-Audit-Users" | Select-Object Name, SamAccountName
   ```

2. Clear the 15-minute membership cache:
   ```powershell
   iisreset
   ```

3. Check what role the backend sees:
   ```
   https://audit.martinsupply.com/api/auth/status
   ```

### Sign-In Prompt Loops

- Verify IIS Authentication: Anonymous **Disabled**, Windows **Enabled**
- From VM: loopback registry key must be set (see below)
- For office users: Intranet zone GPO must be pushed

### Auto-Deploy Failed

1. Check the Actions tab: `https://github.com/MartinSupply/martin-audit-web/actions`
2. Click the failed run to see which step failed
3. Check the runner is running:
   ```powershell
   Get-Service | Where-Object { $_.Name -like '*actions*' }
   ```
   If stopped:
   ```powershell
   Start-Service -Name (Get-Service | Where-Object { $_.Name -like '*actions*' }).Name
   ```

### After a VM Reboot

Both IIS and the GitHub Actions runner start automatically. Verify:
```
https://audit.martinsupply.com/api/health
```
```powershell
Get-Service | Where-Object { $_.Name -like '*actions*' }
```

### Missing Dependencies After Code Update

```powershell
cd C:\inetpub\martin-audit-app
npm install
cd server
npm install
cd ..
npm run build
iisreset
```

---

## IIS Setup Reference

### What's Installed

- **IIS** with Windows Authentication
- **URL Rewrite Module**
- **iisnode** (x64 MSI from github.com/azure/iisnode)

ARR and PM2 are NOT used.

### Site Configuration

- **Site name:** Martin Audit
- **Physical path:** `C:\inetpub\martin-audit-app` (project root, NOT build/)
- **Binding:** HTTPS, port 443, hostname `audit.martinsupply.com`
- **Authentication:** Anonymous Disabled, Windows Enabled (Negotiate + NTLM)

### One-Time Setup Commands

```powershell
# Unlock handlers
C:\Windows\System32\inetsrv\appcmd.exe unlock config -section:system.webServer/handlers

# Folder permissions
icacls "C:\inetpub\martin-audit-app" /grant "IIS AppPool\Martin Audit:(OI)(CI)M" /T
icacls "C:\inetpub\martin-audit-app" /grant "NETWORK SERVICE:(OI)(CI)M" /T

# Git safe directory (for GitHub Actions runner)
git config --system --add safe.directory C:/inetpub/martin-audit-app

# Loopback auth (for VM self-access only)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "BackConnectionHostNames" -Value "audit.martinsupply.com" -PropertyType MultiString -Force
```

### How iisnode Works

- `web.config` defines the iisnode handler and URL rewrite rules
- `iisnode.yml` promotes `AUTH_USER` as a request header to Node.js
- IIS serves static files from `build/` subfolder
- API requests (`/api/*`) route to `server/index.js` via iisnode
- Node.js runs inside the IIS worker process — no separate port
- `iisreset` restarts everything

---

## GitHub Actions Runner

### Location

Installed at `C:\actions-runner` on the VM.

### Service

Runs as a Windows service under LOCAL SYSTEM. Starts automatically on boot.

```powershell
# Check status
Get-Service | Where-Object { $_.Name -like '*actions*' }

# Start if stopped
Start-Service -Name (Get-Service | Where-Object { $_.Name -like '*actions*' }).Name

# Stop
Stop-Service -Name (Get-Service | Where-Object { $_.Name -like '*actions*' }).Name
```

### What it does

Listens for pushes to the `main` branch on `https://github.com/MartinSupply/martin-audit-web`. When triggered, runs the deploy workflow: `git pull` → `npm install` → `npm run build` → `iisreset`.

### Re-registering the runner

If the runner needs to be reconfigured (e.g., moved to a different repo):

```powershell
cd C:\actions-runner
.\config.cmd remove
.\config.cmd --url https://github.com/MartinSupply/martin-audit-web --token NEW_TOKEN --runasservice
```

Get a fresh token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner

---

## Security Groups

| AD Group | Role | Access |
|----------|------|--------|
| Martin-Audit-Users | USERS | All except Security. Pricing/cost/banking masked. |
| Martin-Audit-Finance | FINANCE | All except Security. Pricing/cost visible. Banking masked. |
| Martin-Audit-Sensitive | SENSITIVE | All except Security. Everything visible. |
| Martin-Audit-Admin | ADMIN | All modules. Everything visible. |

Groups must be on-prem (ADUC). Cloud-only Entra groups won't work with LDAP.
Membership cached 15 min. `iisreset` clears immediately.

---

## Service Accounts

| Account | Purpose |
|---------|---------|
| MAUD (SXe operator) | Queries Compass Data Lake and SXe APIs. Read-only. |
| MartinAudit@martin.local | LDAP queries for AD group membership. |

---

## Credential Rotation

**Infor:** Update `server/.env` on VM with new OAuth2 credentials → `iisreset`

**AD service account:** Reset password in ADUC → update `server/.env` on VM → `iisreset`

---

## File Locations

| What | Where |
|------|-------|
| Application code | C:\inetpub\martin-audit-app |
| React build | C:\inetpub\martin-audit-app\build |
| Backend code | C:\inetpub\martin-audit-app\server |
| Backend secrets | C:\inetpub\martin-audit-app\server\.env |
| Audit logs | C:\inetpub\martin-audit-app\server\logs\ |
| IIS config | C:\inetpub\martin-audit-app\web.config |
| iisnode config | C:\inetpub\martin-audit-app\iisnode.yml |
| iisnode logs | C:\inetpub\martin-audit-app\iisnode\ |
| GitHub Actions runner | C:\actions-runner |

---

## Audit Logs

Daily JSON-lines files at `server\logs\audit-YYYY-MM-DD.log`. Each line records who queried what and when.

**Review today's log:**
```powershell
type C:\inetpub\martin-audit-app\server\logs\audit-2026-06-10.log
```

**Search for a specific user:**
```powershell
findstr "chpatter" C:\inetpub\martin-audit-app\server\logs\audit-2026-06-10.log
```

**Search for all searches across all dates:**
```powershell
findstr "search" C:\inetpub\martin-audit-app\server\logs\audit-*.log
```

**Search for a specific user across all dates:**
```powershell
findstr "jsmith" C:\inetpub\martin-audit-app\server\logs\audit-*.log
```

**What's logged per entry:**
- Timestamp, username, role, action type (search/po_lookup/recent/access)
- Search filters used (tables, record #, customer, vendor, product, dates)
- Result count

Logs rotate daily, persist until manually deleted, and are gitignored.

---

## Diagnostic Commands

```powershell
# Backend health
curl https://audit.martinsupply.com/api/health -k

# IIS sites
C:\Windows\System32\inetsrv\appcmd.exe list site

# GitHub Actions runner status
Get-Service | Where-Object { $_.Name -like '*actions*' }

# Recent deploy history
# Visit: https://github.com/MartinSupply/martin-audit-web/actions

# AD group members
Get-ADGroupMember "Martin-Audit-Users" | Select-Object Name, SamAccountName
Get-ADGroupMember "Martin-Audit-Admin" | Select-Object Name, SamAccountName

# Check user's groups
Get-ADUser username -Properties MemberOf | Select-Object -ExpandProperty MemberOf | Where-Object { $_ -like "*Audit*" }

# Force AAD Connect sync
Start-ADSyncSyncCycle -PolicyType Delta

# What's on port 443
netstat -ano | findstr :443

# Today's audit log
type C:\inetpub\martin-audit-app\server\logs\audit-2026-06-10.log
```
