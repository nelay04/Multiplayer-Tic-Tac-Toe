import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  player1: { type: String, required: true },
  player2: { type: String, required: true },
  board: { type: [String], default: Array(9).fill(null) },
  turn: { type: String, required: true },
  status: { type: String, enum: ['playing', 'finished', 'abandoned'], default: 'playing' },
  winner: { type: String, default: null },
  winningLine: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now },
  endTime: { type: Date },
});

export const Game = mongoose.model('Game', gameSchema);
