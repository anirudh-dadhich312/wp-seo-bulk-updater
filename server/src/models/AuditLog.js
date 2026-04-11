import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    postId: Number,
    postType: String,
    postUrl: String,
    plugin: String,
    field: { type: String, enum: ['title', 'description', 'both'] },
    oldValue: String,
    newValue: String,
    action: { type: String, enum: ['update', 'rollback'], default: 'update' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

auditLogSchema.index({ site: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
