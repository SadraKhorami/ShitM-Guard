const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    avatar: { type: String },
    license: { type: String, index: true },
    steam: { type: String, index: true },
    rockstar: { type: String, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
