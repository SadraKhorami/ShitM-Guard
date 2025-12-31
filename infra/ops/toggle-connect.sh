#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "run as root" >&2
  exit 1
fi

MODE="${1:-}"
ENV_FILE="${ENV_FILE:-/etc/shitm-guard/api.env}"

if [ -z "$MODE" ] || { [ "$MODE" != "on" ] && [ "$MODE" != "off" ]; }; then
  echo "usage: $0 <on|off>" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

VALUE="true"
if [ "$MODE" = "off" ]; then
  VALUE="false"
fi

if grep -q '^CONNECT_ENABLED=' "$ENV_FILE"; then
  sed -i.bak "s/^CONNECT_ENABLED=.*/CONNECT_ENABLED=${VALUE}/" "$ENV_FILE"
else
  echo "CONNECT_ENABLED=${VALUE}" >> "$ENV_FILE"
fi

systemctl restart api

echo "CONNECT_ENABLED=${VALUE} applied and api restarted" >&2
