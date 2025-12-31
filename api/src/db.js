const mongoose = require('mongoose');
const { config } = require('./config');
const { logger } = require('./utils/log');

const connectDb = async () => {
  if (!config.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.MONGO_URI, {
    autoIndex: false
  });
  logger.info('mongo connected');
};

module.exports = { connectDb };
