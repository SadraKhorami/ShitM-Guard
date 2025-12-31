# FiveM UDP DDoS Mitigation Architecture (Ubuntu)

This is a **realistic**, multi-layer design for a community FiveM RP server. It does not claim “100% protection.” If your uplink or datacenter capacity is saturated, you go down. That is the reality.

---

## Threat Summary
- UDP flood (high PPS, volumetric)
- Bot connect / handshake spam
- Entry IP exposure in F8 
- Direct IP abuse and replay attempts

## Non Negotiable Truths
- FiveM is UDP and session oriented, the final IP:port is visible in F8.
- DNS does not hide IP. Standard Cloudflare does **not** protect UDP game traffic.
- WireGuard is a tunnel, not a firewall, and not DDoS protection.
- Real filtering must happen **before** traffic enters WireGuard.

---

## Architecture (ASCII)
```
Players
  -> Public Auth Web (Cloudflare/WAF, HTTP only)
       - Next.js 15.5.9 (App Router + TSX)
       - Node.js + Express + Mongoose (API)
       - Connect Endpoint (token + allowlist issuing)
  -> Entry Gateway (Public IP, UDP 30120)
       - nftables: fast drop / rate limit / allowlist
       - no heavy processing
  -> WireGuard Tunnel
  -> Origin FiveM (Hidden IP, no public UDP)
       - Accept UDP only from wg0
       - Deferrals + token validation (fail fast)

txAdmin (NOT public)
  -> WireGuard/VPN only + IP allowlist
```

---

## Connection Flow (Option 1: Robust / Recommended)
This avoids any undocumented query parsing in FiveM’s UDP path.

1) User authenticates on the public website (Discord OAuth) and lands at `/console`.
2) Clicking **Connect** issues a short lived, single use token (30-90s):
   - Has `jti`, TTL, stored hashed
   - Bound to Discord ID + FiveM identifiers (license/steam/rockstar)
   - Returns Entry host/port **only after** validation
   - Token is used for auditing, UDP does not rely on it
3) API calls the Entry allowlist service to allow the user IP in nftables (timeout 30-90s).
4) Client connects to Entry IP:port (UDP 30120).
5) Origin `playerConnecting/deferrals` validates against API:
   - token exists, unused, not expired
   - identifiers match, optional IP match
6) Token is burned on first use.

Result: Entry drops everything without allowlist, and Origin refuses unauthorized sessions. This is fail fast and layered.

---

## Connection Flow (Option 2: Only If Verified)
If you insist on `connect play.game.ir?token=XXXX`:
- You must **prove** the token is reliably available in `playerConnecting` on all clients.
- Required tests:
  - multiple client types (Steam/Rockstar)
  - reconnect / crash / quick reconnect cases
  - token extraction from identifiers or endpoint is stable
If there’s any doubt, **fallback to Option 1**.

---

## Layer Separation (Explicit)
### 1) Entry Filtering (primary filter)
Sees UDP 30120 only. Fast drop, minimal logging.

### 2) WireGuard (transport only)
No security claims. Do not rely on WG to filter attacks.

### 3) Origin Isolation (FiveM)
Public UDP is closed. Only wg0 UDP is accepted.
Even if Origin IP leaks, it does not answer on the public interface.

---

## nftables (Minimal, Realistic)
### Entry Gateway (Public)
**Goal: fast drop + short lived allowlist + rate limiting**

```
table inet filter {
  set allow_udp_30120 {
    type ipv4_addr
    flags timeout
    timeout 90s
  }

  chain input {
    type filter hook input priority 0;
    policy drop;

    ct state invalid drop
    ct state established,related accept
    iif "lo" accept

    # SSH only from management IP
    ip saddr { 203.0.113.10 } tcp dport 22 accept

    # UDP 30120 only from allowlist
    udp dport 30120 ip saddr @allow_udp_30120 accept

    # Fast drop for unknowns
    udp dport 30120 limit rate over 200/second drop
  }
}

table inet raw {
  chain prerouting {
    type filter hook prerouting priority -300;
    udp dport 30120 notrack
  }
}
```

### Origin (Hidden)
```
table inet filter {
  chain input {
    type filter hook input priority 0;
    policy drop;

    ct state invalid drop
    ct state established,related accept
    iif "lo" accept

    # Only allow FiveM from WireGuard
    iif "wg0" udp dport 30120 accept

    # SSH only from VPN
    iif "wg0" tcp dport 22 accept
  }
}
```

---

## sysctl / Kernel Tuning (UDP + conntrack)
Tune to your hardware. These are starting points.

```
net.core.netdev_max_backlog = 250000
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384

net.netfilter.nf_conntrack_max = 262144
net.netfilter.nf_conntrack_udp_timeout = 30
net.netfilter.nf_conntrack_udp_timeout_stream = 120

net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
```

If your link is saturated, these settings won’t save you.

---

## Public Web Service (Cloudflare/WAF)
### Role
- Protects HTTP only, not UDP.
- Issues tokens and enforces auth and rate limits.
- Domain `game.ir` is **web only**, not a UDP protection mechanism.

### Practical Controls
- Heavy rate limits on `/connect` and `/api/connect`.
- Set `trust proxy` in Express to read real client IP from Cloudflare headers.
- Strict request body size limits and validation.

---

## Token, Auth, and Abuse Controls
### Requirements
- Token lifetime: **30-90 seconds max**
- Single use (preferred) or bound to strong identifiers
- Replay protection using `jti`, burned on first use
- Rate limit issuance: per IP + per Discord ID + per user

### Recommended Data Model
`connect_tokens` table:
- `jti`, `discord_id`, `ip`, `expires_at`, `used_at`
- `license/steam/rockstar`
- store token **hashed**
- TTL index in Mongo for auto cleanup

### Queue & Throttling
When under attack or at capacity:
- stop issuing new tokens
- keep users in web queue
- prioritize allowlisted groups

---

## FiveM Deferrals (Fail Fast)
Reject unauthorized clients **before** heavy work.
- `deferrals.defer()` immediately
- validate token + identifiers only
- `deferrals.done("Not authorized")` on failure
- perform heavy I/O **after** authorization

---

## txAdmin Hardening
Do **not** expose txAdmin publicly unless you have a concrete threat model.
- WireGuard/VPN only
- strict IP allowlist
- strong unique passwords, rotate regularly
- MFA if available
- minimal logging, separated from game logs
- Nginx proxy only inside VPN

---

## Next.js + Express + Mongo Security
### Sessions / JWT
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, short TTL
- If JWT: short access tokens + refresh rotation + store hashes

### CSRF
- If session based: CSRF is mandatory
- OAuth: validate `state`
- This repo: fetch token from `/api/csrf` and send `X-CSRF-Token`

### Rate Limits
- per IP + per user + per Discord ID (Redis/shared store)
- stricter on `/connect`, `/oauth/callback`, `/login`

### Secrets & Logging
- secrets only in ENV or vault
- structured logs with `request_id`, `ip`, `user_id`
- never log secrets or tokens

---

## High Level Deployment Steps
1) Deploy **separate** Entry and Origin VMs 
2) Configure WireGuard between Entry and Origin.
3) Apply nftables on both servers.
4) Deploy web (Next.js + API) behind Cloudflare.
5) Implement Connect Endpoint + Entry allowlist API.
6) Enable deferrals on FXServer.
7) Restrict txAdmin to VPN only.
8) Monitor and test under controlled load.

---

## Repo Layout
- `api/` Express + Mongoose (OAuth, tokens, validation)
- `web/` Next.js 15.5.9 App Router (TSX) + HeroUI
- `infra/` nftables, sysctl, WireGuard, nginx, systemd
- `fivem/` auth_gate resource (deferrals)

---

## Practical Deployment (Minimal)
### Entry Gateway
1) Apply `infra/nftables/entry.nft`.
2) Configure `infra/wireguard/entry-wg0.conf`.
3) Allowlist service:
   - `/opt/shitm-guard/infra/entry-allowlist`
   - copy `infra/entry-allowlist/.env.example` to `/etc/shitm-guard/entry-allowlist.env`
   - systemd: `infra/systemd/entry-allowlist.service`
   - create user `nftd` with `CAP_NET_ADMIN` (or intentionally run as root)
   - listen on WG IP only, protect with `X-Entry-Token`
   - set `ALLOWED_SOURCES` to limit who can call the allowlist API
   - IPv4 only by default (expand if you need IPv6)

### Origin
1) Apply `infra/nftables/origin.nft`.
2) Configure `infra/wireguard/origin-wg0.conf`.
3) FXServer resource:
   - `fivem/resources/[security]/auth_gate`
   - set `auth_api_base` and `auth_api_secret` in `server.cfg`

Example `server.cfg`:
```
set auth_api_base "https://game.ir"
set auth_api_secret "replace me"
set auth_api_timeout_ms "5000"
ensure auth_gate
```

### Web/API
1) Deploy `api/` and fill `.env` from `api/.env.example`.
2) Build and start `web/`.
3) Apply Nginx config from `infra/nginx/web.conf`.
4) Generate Cloudflare real IP list via `infra/nginx/update-cloudflare-ips.sh` and place it at `/etc/nginx/cloudflare_realip.conf`.
5) Include `/etc/nginx/security.conf` and `/etc/nginx/ratelimits.conf` (templates in `infra/nginx/`).
   - `ratelimits.conf` must be included in the `http {}` context.

---

## Operational Recommendations
- Keep Entry minimal: extra services = extra attack surface.
- Maintain a hot spare Entry (IP rotation in minutes).
- Monitor PPS, CPU, conntrack, WG RX/TX.
- Rate limit logs, disk IO can kill you during an attack.
- Version and snapshot configs for fast recovery.
- Assume adaptive attackers will probe your edges.

---

## Active Attack Playbook
1) **Stop issuing tokens** (set `CONNECT_ENABLED=false` and restart API).
2) Lower allowlist TTLs.
3) Tighten UDP rate limits.
4) Rotate Entry if needed (new IP).
5) Request temporary null route on old IP from the datacenter.
6) Slowly restore normal policy after traffic drops.

---

## Entry IP Leakage in F8 and Why It’s OK
Players will see the Entry IP in F8. That is normal. The goal is not to hide the IP (you can’t), but to make it **useless without authorization**:
- Entry drops UDP unless allowlisted.
- Tokens are short lived and single use.
- Entry is disposable and quickly rotatable.
Knowing the IP alone does not grant access.

---

## Entry Rotation Strategy (IP/Port)
- Keep at least 2 Entry gateways ready.
- Connect Endpoint always returns the **active** IP.
- Old IP: immediate drop or null route.
- If you change ports, announce only via Connect Endpoint, never raw to users.

---

## Effectiveness Estimates
```
Attack Type           Low   Medium   High
UDP flood             High  Medium   Low
Bot connect spam      High  Medium   Low-Medium
```
If your uplink or DC capacity is saturated, effectiveness collapses.

---

## What It Mitigates
- low/medium UDP floods (rate limit + allowlist)
- bot connect spam without auth
- direct IP abuse without valid tokens

## What It Does NOT Mitigate
- volumetric DDoS that saturates your uplink/ISP
- distributed attacks using compromised real accounts
- upstream carpet bombing
- structural limits of Iranian hosting without real scrubbing

---

## Security Warnings & Common Mistakes
- Trusting DNS or Cloudflare for UDP protection.
- Allowing public UDP access to Origin.
- Long lived or reusable tokens.
- Public txAdmin or no VPN.
- Excessive logging on Entry.
- No rapid Entry rotation plan.
