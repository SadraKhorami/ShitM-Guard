const crypto = require('crypto');
const { nanoid } = require('nanoid');
const ConnectToken = require('../models/ConnectToken');
const { config } = require('../config');

const hashToken = (token) => {
  if (!config.TOKEN_HASH_SECRET) {
    throw new Error('TOKEN_HASH_SECRET is required');
  }
  return crypto.createHmac('sha256', config.TOKEN_HASH_SECRET).update(token).digest('hex');
};

const createConnectToken = async ({ user, ip }) => {
  const identifiers = {
    license: user.license || null,
    steam: user.steam || null,
    rockstar: user.rockstar || null
  };

  if (!identifiers.license && !identifiers.steam && !identifiers.rockstar) {
    throw new Error('identifiers_required');
  }

  const token = nanoid(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.TOKEN_TTL_SECONDS * 1000);

  const record = await ConnectToken.create({
    tokenHash,
    discordId: user.discordId,
    ip,
    identifiers,
    expiresAt
  });

  return { token, record };
};

const findActiveTokenForUser = async (discordId) => {
  return ConnectToken.findOne({
    discordId,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

const countRecentTokens = async (discordId, sinceMs) => {
  return ConnectToken.countDocuments({
    discordId,
    createdAt: { $gt: new Date(Date.now() - sinceMs) }
  });
};

const consumeTokenByIdentifiers = async ({ identifiers, ip }) => {
  const now = new Date();
  const clauses = [];

  if (identifiers.license) clauses.push({ 'identifiers.license': identifiers.license });
  if (identifiers.steam) clauses.push({ 'identifiers.steam': identifiers.steam });
  if (identifiers.rockstar) clauses.push({ 'identifiers.rockstar': identifiers.rockstar });

  if (clauses.length === 0) return null;

  const query = {
    usedAt: null,
    expiresAt: { $gt: now },
    $or: clauses
  };

  if (config.ENFORCE_IP_MATCH) {
    query.ip = ip;
  }

  return ConnectToken.findOneAndUpdate(query, { $set: { usedAt: now } }, { sort: { createdAt: -1 } });
};

module.exports = {
  createConnectToken,
  findActiveTokenForUser,
  countRecentTokens,
  consumeTokenByIdentifiers
};
