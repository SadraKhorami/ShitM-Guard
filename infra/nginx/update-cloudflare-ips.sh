#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-/etc/nginx/cloudflare_realip.conf}"
TMP="${OUT}.tmp"

{
  echo "# Generated from https://www.cloudflare.com/ips/"
  curl -fsS https://www.cloudflare.com/ips-v4 | while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;"
  done
  curl -fsS https://www.cloudflare.com/ips-v6 | while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;"
  done
} > "$TMP"

if ! grep -q "set_real_ip_from" "$TMP"; then
  echo "cloudflare ip list is empty" >&2
  exit 1
fi

mv "$TMP" "$OUT"
