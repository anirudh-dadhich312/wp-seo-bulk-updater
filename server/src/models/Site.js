import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema(
  {
    name:                 { type: String, required: true, trim: true },
    siteUrl:              { type: String, required: true, trim: true },
    username:             { type: String, required: true, trim: true },
    appPasswordEncrypted: { type: String, required: true },
    detectedPlugin: {
      type:    String,
      enum:    ['yoast', 'rankmath', 'aioseo', 'generic', 'unknown'],
      default: 'unknown',
    },
    lastDetectedAt: Date,
    notes:          { type: String, default: '' },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization:   { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    team:           { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  },
  { timestamps: true }
);

siteSchema.index({ organization: 1, createdAt: -1 });

siteSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.appPasswordEncrypted;
  return obj;
};

export default mongoose.model('Site', siteSchema);
