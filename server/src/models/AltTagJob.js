import mongoose from 'mongoose';

const altTagItemSchema = new mongoose.Schema(
  {
    attachmentId: Number,
    sourceUrl:    String,
    filename:     String,
    title:        String,
    currentAlt:   String,
    newAlt:       { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'skipped'],
      default: 'pending',
    },
    error:       String,
    processedAt: Date,
  },
  { _id: false }
);

const altTagJobSchema = new mongoose.Schema(
  {
    site:         { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    team:         { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    status: {
      type: String,
      enum: ['scanning', 'draft', 'running', 'completed', 'failed'],
      default: 'scanning',
    },
    totalItems:   { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    failedCount:  { type: Number, default: 0 },
    items:        [altTagItemSchema],
    startedAt:    Date,
    completedAt:  Date,
    scanError:    String,
  },
  { timestamps: true }
);

altTagJobSchema.index({ createdBy: 1, createdAt: -1 });
altTagJobSchema.index({ site: 1, createdAt: -1 });

export default mongoose.model('AltTagJob', altTagJobSchema);
