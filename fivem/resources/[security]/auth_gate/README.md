# auth_gate 

Purpose: fail fast for unauthorized connections before heavy server work.

## server.cfg
```
set auth_api_base "https://game.ir"
set auth_api_secret "replace-me"
set auth_api_timeout_ms "5000"
set auth_log_errors "true"
set auth_log_interval_sec "10"
ensure auth_gate
```

Notes:
- `auth_api_secret` must match `FIVEM_VALIDATE_SECRET` in the API.
- If you use Entry NAT/masquerade, set `ENFORCE_IP_MATCH=false` in API env.

## Test plan (manual)
1) Login at the web console and set identifiers.
2) Click Connect to get access (token + allowlist).
3) Join the server. You should pass immediately.
4) Reuse the same connect token: should fail.
5) Wait for TTL expiry and try again: should fail.
6) Attempt to connect without allowlist: should fail fast.
