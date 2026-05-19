# Martin Audit System — VM Operations Guide

**Server:** 25MARTINAPP01
**URL:** https://audit.martinsupply.com
**App Path:** C:\inetpub\martin-audit-app
**Backend Config:** C:\inetpub\martin-audit-app\server\.env
**IIS Site:** Martin Audit (port 443, HTTPS)
**Node.js:** Managed by iisnode (inside IIS, no separate process)
**GitHub:** https://github.com/chpatter/martin-audit-web

---

## Deploy an Update

**Frontend-only changes:**
```powershell
cd C:\inetpub\martin-audit-app
git pull
npm run build
```

**Backend changes:**
```powershell
cd C:\inetpub\martin-audit-app
git pull
iisreset
```

**Both:**
```powershell
cd C:\inetpub\martin-audit-app
git pull
npm run build
iisreset
```

---

## Common Commands

| Task | Command |
|------|---------|
| Deploy frontend update | `git pull` then `npm run build` |
| Deploy backend update | `git pull` then `iisreset` |
| Restart Node.js | `iisreset` |
| Check backend health | Browse to `https://audit.martinsupply.com/api/health` |
| Check user auth/role | Browse to `https://audit.martinsupply.com/api/auth/status` |
| Edit backend config | `notepad C:\inetpub\martin-audit-app\server\.env` |
| Clear AD role cache | `iisreset` (cache resets on restart) |
| Check IIS site status | `C:\Windows\System32\inetsrv\appcmd.exe list site "Martin Audit"` |
| Open IIS Manager | `C:\Windows\System32\inetsrv\InetMgr.exe` |
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

### After a VM Reboot

Nothing needed — iisnode starts automatically with IIS. Verify:
```
https://audit.martinsupply.com/api/health
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

**Infor:** Update `server/.env` with new OAuth2 credentials → `iisreset`

**AD service account:** Reset password in ADUC → update `server/.env` → `iisreset`

---

## File Locations

| What | Where |
|------|-------|
| Application code | C:\inetpub\martin-audit-app |
| React build | C:\inetpub\martin-audit-app\build |
| Backend code | C:\inetpub\martin-audit-app\server |
| Backend secrets | C:\inetpub\martin-audit-app\server\.env |
| IIS config | C:\inetpub\martin-audit-app\web.config |
| iisnode config | C:\inetpub\martin-audit-app\iisnode.yml |
| iisnode logs | C:\inetpub\martin-audit-app\iisnode\ |

---

## Diagnostic Commands

```powershell
# Backend health
curl https://audit.martinsupply.com/api/health -k

# IIS sites
C:\Windows\System32\inetsrv\appcmd.exe list site

# AD group members
Get-ADGroupMember "Martin-Audit-Users" | Select-Object Name, SamAccountName
Get-ADGroupMember "Martin-Audit-Admin" | Select-Object Name, SamAccountName

# Check user's groups
Get-ADUser username -Properties MemberOf | Select-Object -ExpandProperty MemberOf | Where-Object { $_ -like "*Audit*" }

# Force AAD Connect sync
Start-ADSyncSyncCycle -PolicyType Delta

# What's on port 443
netstat -ano | findstr :443
```
