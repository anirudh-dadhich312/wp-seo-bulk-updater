import mongoose from 'mongoose';

const jobRowSchema = new mongoose.Schema(
  {
    postUrl: String,
    newTitle: String,
    newDescription: String,
    resolvedPostId: Number,
    resolvedPostType: String,
    oldTitle: String,
    oldDescription: String,
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'skipped'],
      default: 'pending',
    },
    error: String,
    processedAt: Date,
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'running', 'completed', 'failed', 'cancelled'],
      default: 'draft',
    },
    pluginUsed: String,
    totalRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    rows: [jobRowSchema],
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Job', jobSchema);
