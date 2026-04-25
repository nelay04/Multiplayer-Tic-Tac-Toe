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
    // Clear session data on startup for a clean dev slate
    await Promise.all([User.deleteMany({}), Game.deleteMany({})]);
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
}

startServer();
