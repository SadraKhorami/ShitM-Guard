const { config } = require('../config');
const { logger } = require('../utils/log');

const allowlistIp = async (ip, ttlSeconds) => {
  if (!config.ENTRY_ALLOWLIST_URL || !config.ENTRY_ALLOWLIST_TOKEN) {
    throw new Error('entry_allowlist_not_configured');
  }

  const ttl = Math.min(ttlSeconds, config.ENTRY_ALLOWLIST_MAX_TTL_SECONDS);

  const res = await fetch(config.ENTRY_ALLOWLIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Entry-Token': config.ENTRY_ALLOWLIST_TOKEN
    },
    body: JSON.stringify({ ip, ttl })
  });

  if (!res.ok) {
    const body = await res.text();
    logger.warn({ status: res.status, body }, 'entry allowlist failed');
    throw new Error('entry_allowlist_failed');
  }

  return true;
};

module.exports = { allowlistIp };
