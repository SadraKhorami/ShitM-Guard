const rateLimit = require('express-rate-limit');

const createRateLimiter = (options) => rateLimit({
  windowMs: options.windowMs,
  max: options.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' }
});

module.exports = { createRateLimiter };
