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

auditLogSchema.index({ site: 1,      createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
// Auto-delete audit logs older than 90 days so the collection never bloats
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model('AuditLog', auditLogSchema);
