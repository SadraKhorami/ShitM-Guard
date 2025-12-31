const parseIntStrict = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseBool = (value, fallback) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

const splitList = (value) => {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

const TOKEN_MIN_TTL_SECONDS = parseIntStrict(process.env.TOKEN_MIN_TTL_SECONDS, 30);
const TOKEN_TTL_SECONDS = parseIntStrict(process.env.TOKEN_TTL_SECONDS, 60);
const TOKEN_MAX_TTL_SECONDS = parseIntStrict(process.env.TOKEN_MAX_TTL_SECONDS, 90);

const clampTokenTtl = () => {
  if (TOKEN_TTL_SECONDS < TOKEN_MIN_TTL_SECONDS) return TOKEN_MIN_TTL_SECONDS;
  if (TOKEN_TTL_SECONDS > TOKEN_MAX_TTL_SECONDS) return TOKEN_MAX_TTL_SECONDS;
  return TOKEN_TTL_SECONDS;
};

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseIntStrict(process.env.PORT, 8080),
  TRUST_PROXY: parseIntStrict(process.env.TRUST_PROXY, 1),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  MONGO_URI: process.env.MONGO_URI,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_NAME: process.env.SESSION_NAME || 'shitm.sid',
  SESSION_MAX_AGE_MS: parseIntStrict(process.env.SESSION_MAX_AGE_MS, 86400000),
  COOKIE_SECURE: parseBool(process.env.COOKIE_SECURE, true),

  CORS_ORIGIN: splitList(process.env.CORS_ORIGIN),

  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_CALLBACK_URL: process.env.DISCORD_CALLBACK_URL,
  POST_LOGIN_REDIRECT: process.env.POST_LOGIN_REDIRECT || '/',

  TOKEN_TTL_SECONDS: clampTokenTtl(),
  TOKEN_HASH_SECRET: process.env.TOKEN_HASH_SECRET,
  CONNECT_ENABLED: parseBool(process.env.CONNECT_ENABLED, true),
  CONNECT_BLOCK_REASON: process.env.CONNECT_BLOCK_REASON || 'connect_disabled',
  CONNECT_COOLDOWN_SECONDS: parseIntStrict(process.env.CONNECT_COOLDOWN_SECONDS, 15),
  CONNECT_RATE_PER_MIN: parseIntStrict(process.env.CONNECT_RATE_PER_MIN, 3),
  ENFORCE_IP_MATCH: parseBool(process.env.ENFORCE_IP_MATCH, true),

  ENTRY_PUBLIC_HOST: process.env.ENTRY_PUBLIC_HOST || 'entry.yourdomain.com',
  ENTRY_PUBLIC_PORT: parseIntStrict(process.env.ENTRY_PUBLIC_PORT, 30120),
  ENTRY_ALLOWLIST_URL: process.env.ENTRY_ALLOWLIST_URL,
  ENTRY_ALLOWLIST_TOKEN: process.env.ENTRY_ALLOWLIST_TOKEN,
  ENTRY_ALLOWLIST_TIMEOUT_SECONDS: parseIntStrict(process.env.ENTRY_ALLOWLIST_TIMEOUT_SECONDS, 60),
  ENTRY_ALLOWLIST_MAX_TTL_SECONDS: parseIntStrict(process.env.ENTRY_ALLOWLIST_MAX_TTL_SECONDS, 90),

  FIVEM_VALIDATE_SECRET: process.env.FIVEM_VALIDATE_SECRET
};

module.exports = { config };
