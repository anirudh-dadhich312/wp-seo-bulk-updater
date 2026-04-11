import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    siteUrl: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    // AES-256-GCM encrypted application password (base64)
    appPasswordEncrypted: { type: String, required: true },
    detectedPlugin: {
      type: String,
      enum: ['yoast', 'rankmath', 'aioseo', 'generic', 'unknown'],
      default: 'unknown',
    },
    lastDetectedAt: Date,
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

siteSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.appPasswordEncrypted;
  return obj;
};

export default mongoose.model('Site', siteSchema);
