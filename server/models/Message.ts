import mongoose from 'mongoose';

/**
 * One chat message belonging to a game. `content` holds the AES-256-GCM
 * envelope produced by utils/encryption -- the plaintext is never written to
 * the database. `sender` stays in the clear because it is part of the
 * ciphertext's authenticated data and is needed to decrypt the row.
 */
const messageSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
  sender: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Transcripts are always read as a single game's messages in send order.
messageSchema.index({ gameId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
