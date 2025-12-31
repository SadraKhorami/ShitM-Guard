require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const pinoHttp = require('pino-http');

const { config } = require('./config');
const { connectDb } = require('./db');
const { logger } = require('./utils/log');
const User = require('./models/User');
const { authRouter } = require('./routes/auth');
const { connectRouter } = require('./routes/connect');
const { fivemRouter } = require('./routes/fivem');

const required = [
  'MONGO_URI',
  'SESSION_SECRET',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_CALLBACK_URL',
  'FIVEM_VALIDATE_SECRET',
  'TOKEN_HASH_SECRET',
  'ENTRY_ALLOWLIST_URL',
  'ENTRY_ALLOWLIST_TOKEN'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.error({ missing }, 'missing required env');
  process.exit(1);
}

const app = express();

app.set('trust proxy', config.TRUST_PROXY);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false }));

if (config.CORS_ORIGIN.length > 0) {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (config.CORS_ORIGIN.includes(origin)) return callback(null, true);
        return callback(new Error('CORS not allowed'));
      },
      credentials: true
    })
  );
}

app.use(
  session({
    name: config.SESSION_NAME,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: config.MONGO_URI }),
    cookie: {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: config.SESSION_MAX_AGE_MS
    }
  })
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new DiscordStrategy(
    {
      clientID: config.DISCORD_CLIENT_ID,
      clientSecret: config.DISCORD_CLIENT_SECRET,
      callbackURL: config.DISCORD_CALLBACK_URL,
      scope: ['identify'],
      state: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const update = {
          $set: {
            username: profile.username,
            avatar: profile.avatar || null
          },
          $setOnInsert: {
            discordId: profile.id
          }
        };

        const user = await User.findOneAndUpdate(
          { discordId: profile.id },
          update,
          { new: true, upsert: true }
        );

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRouter);
app.use('/api', connectRouter);
app.use('/api/fivem', fivemRouter);

app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'csrf_invalid' });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  logger.error({ err }, 'unhandled');
  res.status(500).json({ error: 'server_error' });
});

const start = async () => {
  await connectDb();
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'api listening');
  });
};

start().catch((err) => {
  logger.error({ err }, 'startup_failed');
  process.exit(1);
});
