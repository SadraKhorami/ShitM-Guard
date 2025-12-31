#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "run as root" >&2
  exit 1
fi

REPO_DIR="${REPO_DIR:-/opt/shitm-guard}"
ENV_DIR="/etc/shitm-guard"
ALLOWLIST_ENV="${ENV_DIR}/entry-allowlist.env"
NFTA_CONF="/etc/nftables.conf"

if [ ! -d "${REPO_DIR}/infra" ]; then
  echo "REPO_DIR not found: ${REPO_DIR}" >&2
  exit 1
fi

apt-get update
apt-get install -y nftables wireguard-tools curl

if ! command -v node >/dev/null 2>&1; then
  echo "node is required for entry-allowlist (install node 18+)." >&2
  exit 1
fi

mkdir -p "${ENV_DIR}"
if [ ! -f "${ALLOWLIST_ENV}" ]; then
  cp "${REPO_DIR}/infra/entry-allowlist/.env.example" "${ALLOWLIST_ENV}"
  echo "edit ${ALLOWLIST_ENV} before starting entry-allowlist" >&2
fi

if ! id nftd >/dev/null 2>&1; then
  useradd -r -s /usr/sbin/nologin nftd
fi

install -m 0644 "${REPO_DIR}/infra/sysctl/99-fivem-entry.conf" /etc/sysctl.d/99-fivem-entry.conf
sysctl --system

if [ -f "${NFTA_CONF}" ]; then
  cp "${NFTA_CONF}" "${NFTA_CONF}.bak.$(date +%s)"
fi
install -m 0644 "${REPO_DIR}/infra/nftables/entry.nft" "${NFTA_CONF}"
systemctl enable nftables
systemctl restart nftables

install -m 600 "${REPO_DIR}/infra/wireguard/entry-wg0.conf" /etc/wireguard/wg0.conf
systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0

install -m 0644 "${REPO_DIR}/infra/systemd/entry-allowlist.service" /etc/systemd/system/entry-allowlist.service
systemctl daemon-reload
systemctl enable entry-allowlist

echo "entry setup complete. edit ${ALLOWLIST_ENV} and then: systemctl restart entry-allowlist" >&2
