These scripts are **optional helpers** for Ubuntu. They assume the repo lives at `/opt/shitm-guard` unless you set `REPO_DIR`.

## Entry
```
REPO_DIR=/opt/shitm-guard sudo bash infra/deploy/entry-setup.sh
```

## Origin
```
REPO_DIR=/opt/shitm-guard sudo bash infra/deploy/origin-setup.sh
```

## Web/API
```
REPO_DIR=/opt/shitm-guard sudo bash infra/deploy/web-setup.sh
```

## Validate (basic checks)
```
sudo bash infra/deploy/validate.sh
```

Notes:
- Scripts will overwrite `/etc/nftables.conf` (a backup is created).
- You must install Node.js 18+ on Entry (for allowlist) and Web/API servers.
- Edit env files under `/etc/shitm-guard/` before starting services.
