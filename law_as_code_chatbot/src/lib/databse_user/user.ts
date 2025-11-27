import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  verificationCode: { type: String }, 
  verificationCodeExpires: { type: Date },
  isVerified: { type: Boolean, default: false }, // Email verification status
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);