#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "run as root" >&2
  exit 1
fi

REPO_DIR="${REPO_DIR:-/opt/shitm-guard}"
ENV_DIR="/etc/shitm-guard"
API_ENV="${ENV_DIR}/api.env"
WEB_ENV="${ENV_DIR}/web.env"

if [ ! -d "${REPO_DIR}/api" ] || [ ! -d "${REPO_DIR}/web" ]; then
  echo "REPO_DIR not found: ${REPO_DIR}" >&2
  exit 1
fi

apt-get update
apt-get install -y nginx curl

if ! command -v node >/dev/null 2>&1; then
  echo "node is required (install node 18+)." >&2
  exit 1
fi

mkdir -p "${ENV_DIR}"
if [ ! -f "${API_ENV}" ]; then
  cp "${REPO_DIR}/api/.env.example" "${API_ENV}"
  echo "edit ${API_ENV} before starting api" >&2
fi

if [ ! -f "${WEB_ENV}" ]; then
  cp "${REPO_DIR}/web/.env.example" "${WEB_ENV}"
  echo "edit ${WEB_ENV} before starting web" >&2
fi

install -m 0644 "${REPO_DIR}/infra/systemd/api.service" /etc/systemd/system/api.service
install -m 0644 "${REPO_DIR}/infra/systemd/web.service" /etc/systemd/system/web.service
systemctl daemon-reload
systemctl enable api web

echo "web setup complete. install deps, build web, and start services." >&2
