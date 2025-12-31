#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "run as root" >&2
  exit 1
fi

REPO_DIR="${REPO_DIR:-/opt/shitm-guard}"
NFTA_CONF="/etc/nftables.conf"

if [ ! -d "${REPO_DIR}/infra" ]; then
  echo "REPO_DIR not found: ${REPO_DIR}" >&2
  exit 1
fi

apt-get update
apt-get install -y nftables wireguard-tools

install -m 0644 "${REPO_DIR}/infra/sysctl/99-fivem-ddos.conf" /etc/sysctl.d/99-fivem-ddos.conf
sysctl --system

if [ -f "${NFTA_CONF}" ]; then
  cp "${NFTA_CONF}" "${NFTA_CONF}.bak.$(date +%s)"
fi
install -m 0644 "${REPO_DIR}/infra/nftables/origin.nft" "${NFTA_CONF}"
systemctl enable nftables
systemctl restart nftables

install -m 600 "${REPO_DIR}/infra/wireguard/origin-wg0.conf" /etc/wireguard/wg0.conf
systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0

echo "origin setup complete. install FXServer and enable auth_gate resource" >&2
