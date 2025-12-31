# Phase 4 Ops Runbook 

This is a pragmatic ops layer. It assumes you already deployed Entry/Origin/Web.

## Attack Mode (stop issuing tokens)
```
sudo bash infra/ops/toggle-connect.sh off
```

Re-enable:
```
sudo bash infra/ops/toggle-connect.sh on
```

## Entry Health Check
```
sudo bash infra/ops/entry-health.sh
```

## Entry Rotation (manual outline)
1) Prepare a hot-spare Entry with identical config and WG keys updated.
2) Update Connect Endpoint to return the new Entry IP.
3) Null-route or drop UDP on the old Entry IP at the datacenter.
4) Monitor PPS and allowlist hit rate on the new Entry.

## Daily/Weekly Checks
- PPS and CPU on Entry (high PPS == attack or abuse)
- `nft list set inet filter allow_udp_30120` (allowlist growth)
- `wg show` (keepalive, handshake time)
- API health endpoint: `/health`

## Log Strategy
- Keep logs minimal on Entry.
- Rely on journald for API/web logs; export if needed.
- Never log tokens or secrets.
