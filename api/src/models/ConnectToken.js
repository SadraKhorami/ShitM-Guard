const mongoose = require('mongoose');

const IdentifierSchema = new mongoose.Schema(
  {
    license: { type: String },
    steam: { type: String },
    rockstar: { type: String }
  },
  { _id: false }
);

const ConnectTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    discordId: { type: String, required: true, index: true },
    ip: { type: String, required: true },
    identifiers: { type: IdentifierSchema, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

ConnectTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ConnectToken', ConnectTokenSchema);
