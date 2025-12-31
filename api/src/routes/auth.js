const express = require('express');
const passport = require('passport');
const { createRateLimiter } = require('../middleware/rateLimit');
const { config } = require('../config');

const router = express.Router();
const authLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });

router.get('/discord', authLimiter, passport.authenticate('discord'));

router.get(
  '/discord/callback',
  authLimiter,
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(config.POST_LOGIN_REDIRECT);
  }
);

router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie(config.SESSION_NAME);
      res.json({ ok: true });
    });
  });
});

module.exports = { authRouter: router };
