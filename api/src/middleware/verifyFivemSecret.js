const { config } = require('../config');

const verifyFivemSecret = (req, res, next) => {
  const header = req.get('X-Fivem-Secret');
  if (!header || header !== config.FIVEM_VALIDATE_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
};

module.exports = { verifyFivemSecret };
