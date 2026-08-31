import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Play, Swords, LogOut, History, Minus, X as XIcon, Settings, Palette, Moon, Sun, Crown, Handshake, HeartCrack } from 'lucide-react';
import Chat from './Chat';
import type { UserType, GameHistory, ChatMessage, Theme } from '../types';

interface LobbyProps {
  currentUser: string;
  users: UserType[];
  invitations: string[];
  history: GameHistory[];
  /** Decrypted transcripts of finished matches, keyed by game id. */
  chatHistories: Record<string, ChatMessage[]>;
  onLoadChatHistory: (gameId: string) => void;
  waitingInvites: string[];
  cooldownInvites: {username: string, expiresAt: number}[];
  theme: Theme;
  setTheme: (theme: Theme) => void;
  xColor: string;
  setXColor: (color: string) => void;
  oColor: string;
  setOColor: (color: string) => void;
  onInvite: (username: string) => void;
  onAcceptInvite: (username: string) => void;
  onDeclineInvite: (username: string) => void;
  onPlayComputer: () => void;
  onLogout: () => void;
}

function WaitingDots() {
  const [dots, setDots] = React.useState('');
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <span className="inline-block text-left w-3">{dots}</span>;
}

function UserRow({ user, isWaiting, cooldownInfo, onInvite }: { user: UserType; isWaiting: boolean; cooldownInfo?: { username: string; expiresAt: number }; onInvite: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!cooldownInfo) {
      setTimeLeft(0);
      return;
    }
    
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((cooldownInfo.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [cooldownInfo]);

  const isCooldown = !!cooldownInfo && timeLeft > 0;
  const showDeclined = isCooldown && timeLeft > 10; // First 1 second shows "Declined"
  const showTimer = isCooldown && timeLeft <= 10;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/50"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
            <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{user.username.charAt(0).toUpperCase()}</span>
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${user.status === 'idle' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
        </div>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.username}</p>
          <p className="text-xs text-zinc-500 capitalize">{user.status}</p>
        </div>
      </div>
      
      <button
        onClick={onInvite}
        disabled={user.status !== 'idle' || isWaiting || isCooldown}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isWaiting 
            ? 'bg-amber-500 dark:bg-amber-600 text-white' 
            : isCooldown 
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white'
        }`}
      >
        {isWaiting ? (
          <span className="flex items-center w-16">Waiting<WaitingDots /></span>
        ) : showDeclined ? (
          'Declined'
        ) : showTimer ? (
          `Wait ${timeLeft}s`
        ) : (
          'Invite'
        )}
      </button>
    </motion.div>
  );
}

export default function Lobby({ 
  currentUser, 
  users, 
  invitations, 
  history,
  chatHistories,
  onLoadChatHistory,
  waitingInvites,
  cooldownInvites,
  theme,
  setTheme,
  xColor,
  setXColor,
  oColor,
  setOColor,
  onInvite, 
  onAcceptInvite, 
  onDeclineInvite,
  onPlayComputer,
  onLogout
}: LobbyProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<GameHistory | null>(null);
  const onlineUsers = users.filter(u => u.username !== currentUser);

  // Transcripts are pulled only when a match is actually opened, then cached
  // by the parent so reopening the same match does not hit the server again.
  const openMatch = (game: GameHistory) => {
    setSelectedMatch(game);
    if (!chatHistories[game._id]) onLoadChatHistory(game._id);
  };

  const colorPresets = [
    { x: '#a546f7', o: '#ffff08', name: 'Neon' },
    { x: '#10b981', o: '#f43f5e', name: 'Classic' },
    { x: '#0ea5e9', o: '#f97316', name: 'Ocean' },
    { x: '#ec4899', o: '#8b5cf6', name: 'Sunset' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <Swords className="text-indigo-500" />
              Game Lobby
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Welcome back, <span className="text-indigo-500 dark:text-indigo-400 font-medium">{currentUser}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Palette className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-xl font-semibold">Appearance Settings</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Theme</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${theme === 'light' ? 'bg-zinc-100 border-zinc-300 text-zinc-900 font-medium' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
                      >
                        <Sun className="w-4 h-4" /> Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-600 text-white font-medium' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'}`}
                      >
                        <Moon className="w-4 h-4" /> Dark
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Piece Colors</h3>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {colorPresets.map(preset => (
                          <button
                            key={preset.name}
                            onClick={() => { setXColor(preset.x); setOColor(preset.o); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title={preset.name}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.x }} />
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.o }} />
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">X:</span>
                          <input 
                            type="color" 
                            value={xColor} 
                            onChange={(e) => setXColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">O:</span>
                          <input 
                            type="color" 
                            value={oColor} 
                            onChange={(e) => setOColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Online Players</h2>
                <span className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-medium">
                  {onlineUsers.length} Online
                </span>
              </div>

              {onlineUsers.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No other players online right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {onlineUsers.map(user => {
                    const isWaiting = waitingInvites.includes(user.username);
                    const cooldownInfo = cooldownInvites.find(c => c.username === user.username);
                    
                    return (
                      <UserRow 
                        key={user.username}
                        user={user}
                        isWaiting={isWaiting}
                        cooldownInfo={cooldownInfo}
                        onInvite={() => onInvite(user.username)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <AnimatePresence>
              {invitations.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6"
                >
                  <h2 className="text-xl font-semibold mb-4 text-emerald-600 dark:text-emerald-400">Game Invites</h2>
                  <div className="space-y-3">
                    {invitations.map(inviter => (
                      <div key={inviter} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <p className="text-sm mb-3"><span className="font-medium text-zinc-900 dark:text-white">{inviter}</span> challenged you!</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onAcceptInvite(inviter)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => onDeclineInvite(inviter)}
                            className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium py-2 rounded-lg transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Match History */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <h2 className="text-xl font-semibold">Match History</h2>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <p>No matches played yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(game => {
                    const opponent = game.player1 === currentUser ? game.player2 : game.player1;
                    const isWin = game.winner === currentUser;
                    const isDraw = game.winner === 'draw';
                    const isAbandoned = game.status === 'abandoned';
                    
                    const startDate = new Date(game.createdAt);
                    const endDate = game.endTime ? new Date(game.endTime) : null;
                    
                    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = endDate ? `${formatTime(startDate)} - ${formatTime(endDate)}` : formatTime(startDate);

                    return (
                      <div 
                        key={game._id} 
                        onClick={() => openMatch(game)}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isWin ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : isDraw ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : isAbandoned ? 'bg-zinc-200 dark:bg-zinc-500/10 text-zinc-500 dark:text-zinc-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                            {isWin ? <Crown className="w-4 h-4" /> : isDraw ? <Handshake className="w-4 h-4" /> : isAbandoned ? <Minus className="w-4 h-4" /> : <HeartCrack className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">vs {opponent}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{dateStr}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${isWin ? 'text-emerald-600 dark:text-emerald-400' : isDraw ? 'text-amber-600 dark:text-amber-400' : isAbandoned ? 'text-zinc-500 dark:text-zinc-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isWin ? 'Victory' : isDraw ? 'Draw' : isAbandoned ? 'Abandoned' : 'Defeat'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-white">Practice Mode</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">Play against the computer to sharpen your skills.</p>
              <button 
                onClick={onPlayComputer}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 dark:bg-white text-white dark:text-zinc-950 hover:bg-indigo-700 dark:hover:bg-zinc-200 font-medium py-3 rounded-xl transition-colors"
              >
                <Play className="w-4 h-4" />
                Play vs Computer
              </button>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl w-full max-w-sm lg:max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Match Snapshot</h3>
                <button 
                  onClick={() => setSelectedMatch(null)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="min-w-0">
                <div className="flex justify-between items-center mb-6 px-4">
                  <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-white">{selectedMatch.player1}</p>
                    <p className="text-xs text-zinc-500">Player 1 (X)</p>
                  </div>
                  <div className="text-zinc-400 font-medium">VS</div>
                  <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-white">{selectedMatch.player2}</p>
                    <p className="text-xs text-zinc-500">Player 2 (O)</p>
                  </div>
                </div>

                <div className="aspect-square w-full max-w-[240px] mx-auto bg-zinc-100 dark:bg-zinc-950 rounded-xl p-4 mb-6 relative">
                  <div className="grid grid-cols-3 h-full relative">
                    {selectedMatch.board.map((cell, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center justify-center border-zinc-300 dark:border-zinc-800
                          ${i < 6 ? 'border-b-4' : ''} 
                          ${i % 3 !== 2 ? 'border-r-4' : ''}
                        `}
                      >
                        {cell === 'X' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="relative w-12 h-12"
                            style={{ color: xColor }}
                          >
                            <div className="absolute inset-0 bg-current rounded-full" style={{ clipPath: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)' }} />
                          </motion.div>
                        )}
                        {cell === 'O' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-12 h-12 border-[8px] border-current rounded-full"
                            style={{ color: oColor }}
                          />
                        )}
                      </div>
                    ))}
                    {selectedMatch.winningLine && selectedMatch.winningLine.length === 3 && (() => {
                      const isHorizontal = Math.floor(selectedMatch.winningLine[0] / 3) === Math.floor(selectedMatch.winningLine[1] / 3);
                      const isVertical = selectedMatch.winningLine[0] % 3 === selectedMatch.winningLine[1] % 3;
                      const isDiagonal1 = selectedMatch.winningLine[0] === 0 && selectedMatch.winningLine[2] === 8;
                      const isDiagonal2 = selectedMatch.winningLine[0] === 2 && selectedMatch.winningLine[2] === 6;

                      let x1 = '0', y1 = '0', x2 = '0', y2 = '0';
                      if (isHorizontal) {
                        const row = Math.floor(selectedMatch.winningLine[0] / 3);
                        y1 = y2 = `${(row * 33.33) + 16.66}`;
                        x1 = '5'; x2 = '95';
                      } else if (isVertical) {
                        const col = selectedMatch.winningLine[0] % 3;
                        x1 = x2 = `${(col * 33.33) + 16.66}`;
                        y1 = '5'; y2 = '95';
                      } else if (isDiagonal1) {
                        x1 = '5'; y1 = '5'; x2 = '95'; y2 = '95';
                      } else if (isDiagonal2) {
                        x1 = '95'; y1 = '5'; x2 = '5'; y2 = '95';
                      }

                      const winningPiece = selectedMatch.board[selectedMatch.winningLine[0]];
                      const strokeColor = winningPiece === 'X' ? xColor : oColor;

                      return (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                          <motion.line
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke={strokeColor}
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </svg>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="font-semibold text-lg text-zinc-900 dark:text-white">
                    {selectedMatch.winner === currentUser ? 'Victory!' : selectedMatch.winner === 'draw' ? 'Draw' : selectedMatch.status === 'abandoned' ? 'Abandoned' : 'Defeat'}
                  </p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 space-y-2 text-sm border border-zinc-200 dark:border-zinc-800/50">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Started</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {new Date(selectedMatch.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selectedMatch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  {selectedMatch.endTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Ended</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {new Date(selectedMatch.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selectedMatch.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
                </div>

                <Chat
                  currentUser={currentUser}
                  messages={chatHistories[selectedMatch._id] ?? []}
                  readOnly
                  emptyLabel={
                    chatHistories[selectedMatch._id]
                      ? 'No messages were sent in this match.'
                      : 'Loading chat...'
                  }
                  className="h-72 lg:h-auto lg:min-h-[420px]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
