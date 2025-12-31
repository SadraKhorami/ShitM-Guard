const express = require('express');
const { verifyFivemSecret } = require('../middleware/verifyFivemSecret');
const { consumeTokenByIdentifiers } = require('../services/tokenService');
const { normalizeIp, isIPv4 } = require('../utils/ip');

const router = express.Router();

const normalizeIdentifier = (value) => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 96) return null;
  if (!/^[a-z0-9:]+$/.test(trimmed)) return null;
  return trimmed;
};

router.post('/validate', verifyFivemSecret, async (req, res) => {
  const identifiers = {
    license: normalizeIdentifier(req.body.license),
    steam: normalizeIdentifier(req.body.steam),
    rockstar: normalizeIdentifier(req.body.rockstar)
  };

  const ip = normalizeIp(req.body.ip);
  if (!ip || !isIPv4(ip)) {
    return res.status(400).json({ error: 'invalid_ip' });
  }

  const token = await consumeTokenByIdentifiers({ identifiers, ip });
  if (!token) {
    return res.status(403).json({ error: 'not_authorized' });
  }

  return res.json({ ok: true });
});

module.exports = { fivemRouter: router };
