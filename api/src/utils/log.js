const pino = require('pino');
const { config } = require('../config');

const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true
  }
});

module.exports = { logger };
