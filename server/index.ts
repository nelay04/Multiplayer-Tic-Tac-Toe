import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';
import cors from 'cors';
import { User } from './models/User';
import { Game } from './models/Game';
import { registerSocketHandlers } from './socket/handlers';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is required. Copy .env.example to .env and fill in your values.'
  );
}

/**
 * Socket ids and in-progress games do not survive a process restart, so the
 * connection-scoped fields are reset on boot. Accounts and finished games are
 * durable and must be left alone -- deleting them here would wipe the database
 * on every container restart.
 */
async function resetEphemeralState() {
  const now = new Date();
  await Promise.all([
    User.updateMany({}, { $set: { status: 'offline', lastSeen: now }, $unset: { socketId: '' } }),
    Game.updateMany({ status: 'playing' }, { $set: { status: 'abandoned', endTime: now } }),
  ]);
  console.log('Reset stale sessions and abandoned in-progress games');
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT ?? '3000', 10);

  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    await resetEphemeralState();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }

  registerSocketHandlers(io);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  installShutdownHandlers(io);
}

/**
 * `docker compose down` sends SIGTERM and then SIGKILLs after a grace period.
 * Without a handler the process dies mid-write, dropping whatever moves were
 * in flight and leaving users stuck 'playing' with dead socket ids. Sockets are
 * closed first, then the bookkeeping is written, then the connection is drained
 * so mongoose flushes everything before the process exits.
 */
function installShutdownHandlers(io: Server) {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down gracefully...`);

    // Backstop: never let a hung close keep the container alive until SIGKILL.
    const forceExit = setTimeout(() => {
      console.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 8000);
    forceExit.unref();

    try {
      // Closes socket.io and the underlying HTTP server, disconnecting clients.
      await new Promise<void>((resolve) => io.close(() => resolve()));

      // Written here rather than relying on per-socket 'disconnect' handlers:
      // those fire asynchronously and would race the connection close below.
      await resetEphemeralState();

      await mongoose.connection.close();
      console.log('Shutdown complete, all writes flushed');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer();
