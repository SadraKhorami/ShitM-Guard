const express = require('express');
const csrf = require('csurf');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { createConnectToken, findActiveTokenForUser, countRecentTokens } = require('../services/tokenService');
const { allowlistIp } = require('../services/entryAllowlist');
const { config } = require('../config');
const { normalizeIp, isIPv4 } = require('../utils/ip');
const User = require('../models/User');

const router = express.Router();
const csrfProtection = csrf();

const connectLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Math.max(5, config.CONNECT_RATE_PER_MIN * 5)
});

router.use(csrfProtection);

router.get('/csrf', requireAuth, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

const normalizeIdentifier = (value) => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 96) return null;
  if (!/^[a-z0-9:]+$/.test(trimmed)) return null;
  return trimmed;
};

router.get('/me', requireAuth, (req, res) => {
  const user = req.user;
  res.json({
    discordId: user.discordId,
    username: user.username,
    avatar: user.avatar || null,
    license: user.license || null,
    steam: user.steam || null,
    rockstar: user.rockstar || null
  });
});

router.post('/identifiers', requireAuth, async (req, res) => {
  const license = normalizeIdentifier(req.body.license);
  const steam = normalizeIdentifier(req.body.steam);
  const rockstar = normalizeIdentifier(req.body.rockstar);

  if (!license && !steam && !rockstar) {
    return res.status(400).json({ error: 'identifiers_required' });
  }

  const updates = {
    license: license || undefined,
    steam: steam || undefined,
    rockstar: rockstar || undefined
  };

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  return res.json({
    ok: true,
    license: user.license || null,
    steam: user.steam || null,
    rockstar: user.rockstar || null
  });
});

router.post('/connect', requireAuth, connectLimiter, async (req, res) => {
  if (!config.CONNECT_ENABLED) {
    return res.status(403).json({ error: config.CONNECT_BLOCK_REASON });
  }

  const ipRaw = normalizeIp(req.ip);
  if (!ipRaw || !isIPv4(ipRaw)) {
    return res.status(400).json({ error: 'invalid_ip' });
  }

  const active = await findActiveTokenForUser(req.user.discordId);
  if (active) {
    return res.status(429).json({ error: 'token_already_active' });
  }

  const recentCount = await countRecentTokens(req.user.discordId, 60 * 1000);
  if (recentCount >= config.CONNECT_RATE_PER_MIN) {
    return res.status(429).json({ error: 'connect_rate_limited' });
  }

  const cooldownCount = await countRecentTokens(req.user.discordId, config.CONNECT_COOLDOWN_SECONDS * 1000);
  if (cooldownCount > 0) {
    return res.status(429).json({ error: 'connect_cooldown' });
  }

  let record;
  try {
    const created = await createConnectToken({ user: req.user, ip: ipRaw });
    record = created.record;

    await allowlistIp(ipRaw, config.ENTRY_ALLOWLIST_TIMEOUT_SECONDS);

    return res.json({
      host: config.ENTRY_PUBLIC_HOST,
      port: config.ENTRY_PUBLIC_PORT,
      expiresIn: config.TOKEN_TTL_SECONDS,
      connectToken: created.token
    });
  } catch (err) {
    if (record) {
      await record.deleteOne();
    }
    const code = err.message || 'connect_failed';
    return res.status(400).json({ error: code });
  }
});

module.exports = { connectRouter: router };
