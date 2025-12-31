const net = require('net');

const isIPv4 = (value) => net.isIP(value) === 4;

const normalizeIp = (value) => {
  if (!value) return null;
  if (value.startsWith('::ffff:')) return value.replace('::ffff:', '');
  return value;
};

module.exports = { isIPv4, normalizeIp };
