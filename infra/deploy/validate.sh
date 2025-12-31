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

ROLE="${1:-all}"

case "$ROLE" in
  entry)
    check "nftables" nft list tables
    check "wg" wg show
    check "allowlist set" nft list set inet filter allow_udp_30120
    check "entry-allowlist service" systemctl is-active entry-allowlist
    ;;
  origin)
    check "nftables" nft list tables
    check "wg" wg show
    ;;
  web)
    check "api service" systemctl is-active api
    check "web service" systemctl is-active web
    check "nginx service" systemctl is-active nginx
    ;;
  all)
    check "nftables" nft list tables
    check "wg" wg show
    check "allowlist set" nft list set inet filter allow_udp_30120
    check "entry-allowlist service" systemctl is-active entry-allowlist
    check "api service" systemctl is-active api
    check "web service" systemctl is-active web
    check "nginx service" systemctl is-active nginx
    ;;
  *)
    echo "usage: $0 <entry|origin|web|all>" >&2
    exit 1
    ;;
esac
