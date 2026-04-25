import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  socketId: { type: String },
  status: { type: String, enum: ['idle', 'playing', 'offline'], default: 'idle' },
  lastSeen: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
