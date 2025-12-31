require('dotenv').config();
const http = require('http');
const { execFile } = require('child_process');
const net = require('net');

const LISTEN_HOST = process.env.LISTEN_HOST;
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || '9001', 10);
const ENTRY_TOKEN = process.env.ENTRY_TOKEN;
const NFT_BIN = process.env.NFT_BIN || '/usr/sbin/nft';
const NFT_FAMILY = process.env.NFT_FAMILY || 'inet';
const NFT_TABLE = process.env.NFT_TABLE || 'filter';
const NFT_SET = process.env.NFT_SET || 'allow_udp_30120';
const MAX_TTL_SECONDS = parseInt(process.env.MAX_TTL_SECONDS || '90', 10);
const ALLOWED_SOURCES = (process.env.ALLOWED_SOURCES || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

const required = ['LISTEN_HOST', 'ENTRY_TOKEN'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('missing env', missing);
  process.exit(1);
}

const sendJson = (res, code, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
};

const normalizeIp = (value) => {
  if (!value) return '';
  if (value.startsWith('::ffff:')) return value.replace('::ffff:', '');
  return value;
};

const isAllowedSource = (remoteAddress) => {
  if (ALLOWED_SOURCES.length === 0) return true;
  const ip = normalizeIp(remoteAddress);
  return ALLOWED_SOURCES.includes(ip);
};

const addAllowlist = (ip, ttlSeconds, cb) => {
  const ttl = Math.min(ttlSeconds, MAX_TTL_SECONDS);
  const element = `{ ${ip} timeout ${ttl}s }`;
  const replaceArgs = ['replace', 'element', NFT_FAMILY, NFT_TABLE, NFT_SET, element];
  const addArgs = ['add', 'element', NFT_FAMILY, NFT_TABLE, NFT_SET, element];

  execFile(NFT_BIN, replaceArgs, (err, stdout, stderr) => {
    if (!err) return cb(null, stdout);

    execFile(NFT_BIN, addArgs, (addErr, addStdout, addStderr) => {
      if (addErr) return cb(addErr, addStderr || addStdout || stderr || stdout);
      return cb(null, addStdout);
    });
  });
};

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/allowlist') {
    return sendJson(res, 404, { error: 'not_found' });
  }

  if (!isAllowedSource(req.socket.remoteAddress)) {
    return sendJson(res, 403, { error: 'forbidden' });
  }

  const token = req.headers['x-entry-token'];
  if (!token || token !== ENTRY_TOKEN) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 2048) req.destroy();
  });

  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      return sendJson(res, 400, { error: 'invalid_json' });
    }

    const ip = payload.ip;
    const ttl = parseInt(payload.ttl, 10);

    if (!ip || net.isIP(ip) !== 4) {
      return sendJson(res, 400, { error: 'invalid_ip' });
    }

    if (!Number.isFinite(ttl) || ttl <= 0) {
      return sendJson(res, 400, { error: 'invalid_ttl' });
    }

    addAllowlist(ip, ttl, (err) => {
      if (err) {
        return sendJson(res, 500, { error: 'nft_failed' });
      }
      return sendJson(res, 200, { ok: true });
    });
  });
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`allowlist listening on ${LISTEN_HOST}:${LISTEN_PORT}`);
});
