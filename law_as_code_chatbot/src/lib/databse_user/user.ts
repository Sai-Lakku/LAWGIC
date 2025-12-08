// law_as_code_chatbot/src/lib/databse_user/user.ts
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  verificationCode: { type: String }, 
  verificationCodeExpires: { type: Date },
  isVerified: { type: Boolean, default: false },

  // added field for user's legal persona
  legalPersona: { 
    type: String, 
    default: "New user interested in Minnesota law." 
  },
  
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);