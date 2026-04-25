import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Gamepad2 } from 'lucide-react';

interface LoginProps {
  onLogin: (credentials: { username: string; password: string }) => void;
  error: string | null;
}

export default function Login({ onLogin, error }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      onLogin({ username: username.trim(), password: password.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-100 dark:bg-indigo-500/10 p-4 rounded-full">
            <Gamepad2 className="w-12 h-12 text-indigo-600 dark:text-indigo-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white text-center mb-2">Tic Tac Toe</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">Login or create a new account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              maxLength={15}
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>
          
          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-rose-500 dark:text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !password.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            Join Game
          </button>
        </form>
      </motion.div>
    </div>
  );
}
