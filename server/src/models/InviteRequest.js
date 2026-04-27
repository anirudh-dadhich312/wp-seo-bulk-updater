import mongoose from 'mongoose';

const inviteRequestSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, trim: true, default: '' },
    status:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    // Populated when approved — stores the raw token so we can show the invite URL
    inviteToken: { type: String },
  },
  { timestamps: true }
);

inviteRequestSchema.index({ email: 1 });
inviteRequestSchema.index({ status: 1 });

export default mongoose.model('InviteRequest', inviteRequestSchema);
