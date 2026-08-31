import type { Server, Socket } from 'socket.io';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { hashPassword, verifyPassword } from '../utils/password';

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

const REACTION_EMOJIS = ['👍', '👎', '😂', '😭', '😴', '😈', '😍'];
const REACTION_COOLDOWN_MS = 400;
// Per-socket throttle for reactions; entries are removed on disconnect.
const lastReactionAt = new Map<string, number>();

async function broadcastUsers(io: Server) {
  const users = await User.find({ status: { $ne: 'offline' } }).select('username status -_id');
  io.emit('users_update', users);
}

async function sendHistory(io: Server, username: string, socketId: string) {
  const history = await Game.find({
    $or: [{ player1: username }, { player2: username }],
    status: { $in: ['finished', 'abandoned'] },
  })
    .sort({ createdAt: -1 })
    .limit(10);
  io.to(socketId).emit('history_update', history);
}

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', async (credentials: { username: string; password: string }) => {
      const { username, password } = credentials;
      try {
        let user = await User.findOne({ username }).select('+password');
        if (user) {
          const { valid, needsRehash } = await verifyPassword(user.password, password);
          if (!valid) {
            socket.emit('register_error', 'Incorrect password.');
            return;
          }
          if (user.status !== 'offline') {
            socket.emit('register_error', 'User is already logged in elsewhere.');
            return;
          }
          if (needsRehash) {
            user.password = await hashPassword(password);
          }
          user.socketId = socket.id;
          user.status = 'idle';
          user.lastSeen = new Date();
          await user.save();
        } else {
          user = new User({ username, password: await hashPassword(password), socketId: socket.id, status: 'idle' });
          await user.save();
        }

        socket.data.username = username;
        socket.emit('register_success', { username });
        await sendHistory(io, username, socket.id);
        await broadcastUsers(io);
      } catch (error) {
        console.error('Register error:', error);
        socket.emit('register_error', 'An error occurred during registration.');
      }
    });

    socket.on('get_users', async () => {
      const users = await User.find({ status: { $ne: 'offline' } }).select('username status -_id');
      socket.emit('users_update', users);
    });

    socket.on('invite', async (targetUsername: string) => {
      const fromUsername = socket.data.username as string | undefined;
      if (!fromUsername) return;

      const targetUser = await User.findOne({ username: targetUsername, status: 'idle' });
      if (targetUser?.socketId) {
        io.to(targetUser.socketId).emit('invitation_received', { from: fromUsername });
      } else {
        socket.emit('invite_error', 'User is not available.');
      }
    });

    socket.on('accept_invite', async (fromUsername: string) => {
      const toUsername = socket.data.username as string | undefined;
      if (!toUsername) return;

      const [fromUser, toUser] = await Promise.all([
        User.findOne({ username: fromUsername }),
        User.findOne({ username: toUsername }),
      ]);

      if (fromUser?.socketId && toUser?.socketId) {
        const game = new Game({ player1: fromUsername, player2: toUsername, turn: fromUsername });
        await game.save();

        fromUser.status = 'playing';
        toUser.status = 'playing';
        await Promise.all([fromUser.save(), toUser.save()]);

        const gameData = {
          id: game._id.toString(),
          player1: game.player1,
          player2: game.player2,
          board: game.board,
          turn: game.turn,
          status: game.status,
        };

        io.to(fromUser.socketId).emit('game_start', gameData);
        io.to(toUser.socketId).emit('game_start', gameData);
        await broadcastUsers(io);
      }
    });

    socket.on('decline_invite', async (fromUsername: string) => {
      const fromUser = await User.findOne({ username: fromUsername });
      if (fromUser?.socketId) {
        io.to(fromUser.socketId).emit('invitation_declined', { by: socket.data.username });
      }
    });

    socket.on('make_move', async ({ gameId, index }: { gameId: string; index: number }) => {
      const username = socket.data.username as string | undefined;
      if (!username) return;

      const game = await Game.findById(gameId);
      if (!game || game.status !== 'playing') return;
      if (game.turn !== username) return;
      if (game.board[index] !== null) return;

      const symbol = game.player1 === username ? 'X' : 'O';
      game.board[index] = symbol;

      let isWin = false;
      let winningLine: number[] = [];
      for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;
        if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
          isWin = true;
          winningLine = pattern;
          break;
        }
      }

      if (isWin) {
        game.status = 'finished';
        game.winner = username;
        game.winningLine = winningLine;
        game.endTime = new Date();
      } else if (!game.board.includes(null)) {
        game.status = 'finished';
        game.winner = 'draw';
        game.endTime = new Date();
      } else {
        game.turn = game.player1 === username ? game.player2 : game.player1;
      }

      await game.save();

      const gameData = {
        id: game._id.toString(),
        player1: game.player1,
        player2: game.player2,
        board: game.board,
        turn: game.turn,
        status: game.status,
        winner: game.winner,
        winningLine: game.winningLine,
      };

      const [p1, p2] = await Promise.all([
        User.findOne({ username: game.player1 }),
        User.findOne({ username: game.player2 }),
      ]);

      if (p1?.socketId) io.to(p1.socketId).emit('game_update', gameData);
      if (p2?.socketId) io.to(p2.socketId).emit('game_update', gameData);

      if (game.status === 'finished') {
        if (p1?.socketId) { p1.status = 'idle'; await p1.save(); await sendHistory(io, p1.username, p1.socketId); }
        if (p2?.socketId) { p2.status = 'idle'; await p2.save(); await sendHistory(io, p2.username, p2.socketId); }
        await broadcastUsers(io);
      }
    });

    socket.on('send_reaction', async ({ gameId, emoji }: { gameId: string; emoji: string }) => {
      const username = socket.data.username as string | undefined;
      if (!username || !REACTION_EMOJIS.includes(emoji)) return;

      const now = Date.now();
      const last = lastReactionAt.get(socket.id) ?? 0;
      if (now - last < REACTION_COOLDOWN_MS) return;
      lastReactionAt.set(socket.id, now);

      try {
        const game = await Game.findById(gameId);
        if (!game) return;
        if (game.player1 !== username && game.player2 !== username) return;

        const opponentUsername = game.player1 === username ? game.player2 : game.player1;
        const opponent = await User.findOne({ username: opponentUsername });
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit('reaction_received', { from: username, emoji });
        }
      } catch (error) {
        console.error('Reaction error:', error);
      }
    });

    socket.on('leave_game', async (gameId: string) => {
      const username = socket.data.username as string | undefined;
      if (!username) return;

      const game = await Game.findById(gameId);
      if (game && game.status === 'playing') {
        game.status = 'abandoned';
        game.endTime = new Date();
        await game.save();

        const [p1, p2] = await Promise.all([
          User.findOne({ username: game.player1 }),
          User.findOne({ username: game.player2 }),
        ]);

        if (p1?.socketId) { io.to(p1.socketId).emit('game_abandoned'); p1.status = 'idle'; await p1.save(); await sendHistory(io, p1.username, p1.socketId); }
        if (p2?.socketId) { io.to(p2.socketId).emit('game_abandoned'); p2.status = 'idle'; await p2.save(); await sendHistory(io, p2.username, p2.socketId); }
        await broadcastUsers(io);
      }
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      lastReactionAt.delete(socket.id);
      const username = socket.data.username as string | undefined;
      if (!username) return;

      const user = await User.findOne({ username });
      if (!user) return;

      user.status = 'offline';
      user.lastSeen = new Date();
      await user.save();

      const activeGame = await Game.findOne({
        $or: [{ player1: username }, { player2: username }],
        status: 'playing',
      });

      if (activeGame) {
        activeGame.status = 'abandoned';
        activeGame.endTime = new Date();
        await activeGame.save();

        const otherUsername = activeGame.player1 === username ? activeGame.player2 : activeGame.player1;
        const otherPlayer = await User.findOne({ username: otherUsername });
        if (otherPlayer?.socketId) {
          io.to(otherPlayer.socketId).emit('game_abandoned');
          otherPlayer.status = 'idle';
          await otherPlayer.save();
          await sendHistory(io, otherPlayer.username, otherPlayer.socketId);
        }
      }

      await broadcastUsers(io);
    });
  });
}
