import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, select: false },
  role: { type: String, default: "user" },
  image: { type: String },
  authProviderId: { type: String },
  authProvider: { type: String, enum: ['credentials', 'google', 'github'] },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

export const User = mongoose.models?.User || mongoose.model("User", userSchema);
