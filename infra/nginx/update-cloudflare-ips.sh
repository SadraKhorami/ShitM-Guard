set -euo pipefail

OUT="${1:-/etc/nginx/cloudflare_realip.conf}"
TMP="${OUT}.tmp"

{
  echo "# Generated from https://www.cloudflare.com/ips/"
  curl -sS https://www.cloudflare.com/ips-v4 | while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;"
  done
  curl -sS https://www.cloudflare.com/ips-v6 | while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;"
  done
} > "$TMP"

mv "$TMP" "$OUT"
