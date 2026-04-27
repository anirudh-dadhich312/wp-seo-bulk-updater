import mongoose from 'mongoose';

const orgSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', orgSchema);
