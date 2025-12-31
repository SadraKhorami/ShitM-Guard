#!/usr/bin/env bash
set -euo pipefail

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "ok: ${name}"
  else
    echo "fail: ${name}"
  fi
}

check "nftables" nft list tables
check "wg" wg show
check "entry allowlist set" nft list set inet filter allow_udp_30120
check "api service" systemctl is-active api
check "web service" systemctl is-active web
check "entry-allowlist service" systemctl is-active entry-allowlist
