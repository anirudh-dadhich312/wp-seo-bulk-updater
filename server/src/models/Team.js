import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    leader:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);
