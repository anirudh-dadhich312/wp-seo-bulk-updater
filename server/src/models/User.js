import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: '' },
    name:     { type: String, default: '' },
    role: {
      type:    String,
      enum:    ['super_admin', 'admin', 'team_leader', 'team_member', 'operator'],
      default: 'team_member',
    },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    team:         { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    status:       { type: String, enum: ['active', 'invited'], default: 'active' },
    inviteToken:   { type: String },
    inviteExpires: { type: Date },
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ organization: 1, role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.inviteToken;
  return obj;
};

// Normalize legacy 'operator' role to 'team_member' for access-control checks
userSchema.virtual('effectiveRole').get(function () {
  return this.role === 'operator' ? 'team_member' : this.role;
});

export default mongoose.model('User', userSchema);
