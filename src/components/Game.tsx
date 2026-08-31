import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X as XIcon, Circle, ArrowLeft } from 'lucide-react';
import Chat from './Chat';
import type { GameState, ChatMessage } from '../types';
import { REACTION_EMOJIS } from '../lib/reactions';

export interface ReactionBubble {
  id: number;
  emoji: string;
  from: string;
  mine: boolean;
  x: number;
}

const REACTION_SEND_COOLDOWN_MS = 450;

interface GameProps {
  currentUser: string;
  gameState: GameState;
  xColor: string;
  oColor: string;
  reactions: ReactionBubble[];
  chatMessages: ChatMessage[];
  onMakeMove: (index: number) => void;
  onLeave: () => void;
  onSendReaction: (emoji: string) => void;
  onSendChat: (text: string) => void;
}

export default function Game({ currentUser, gameState, xColor, oColor, reactions, chatMessages, onMakeMove, onLeave, onSendReaction, onSendChat }: GameProps) {
  const { player1, player2, board, turn, status, winner, winningLine } = gameState;

  const [reactionCooldown, setReactionCooldown] = useState(false);

  const handleSendReaction = (emoji: string) => {
    if (reactionCooldown) return;
    onSendReaction(emoji);
    setReactionCooldown(true);
    setTimeout(() => setReactionCooldown(false), REACTION_SEND_COOLDOWN_MS);
  };

  const isMyTurn = turn === currentUser && status === 'playing';

  const renderCell = (index: number) => {
    const value = board[index];
    const isWinningCell = winningLine?.includes(index);
    
    // Determine borders for hash grid
    const isTopRow = index < 3;
    const isBottomRow = index > 5;
    const isLeftCol = index % 3 === 0;
    const isRightCol = index % 3 === 2;

    let borderClasses = 'border-zinc-200';
    if (!isBottomRow) borderClasses += ' border-b-4';
    if (!isRightCol) borderClasses += ' border-r-4';
    
    return (
      <button
        key={index}
        onClick={() => onMakeMove(index)}
        disabled={value !== null || !isMyTurn || status !== 'playing'}
        className={`
          h-24 sm:h-32 flex items-center justify-center text-5xl transition-all
          ${borderClasses}
          ${!value && isMyTurn ? 'hover:bg-zinc-800/50 cursor-pointer' : ''}
          ${!value && !isMyTurn ? 'cursor-not-allowed' : ''}
        `}
      >
        {value === 'X' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: xColor }}>
            <XIcon className="w-16 h-16" strokeWidth={2.5} />
          </motion.div>
        )}
        {value === 'O' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: oColor }}>
            <Circle className="w-14 h-14" strokeWidth={3} />
          </motion.div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-5xl lg:max-w-7xl flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6 lg:gap-16 xl:gap-24">
        <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-12 xl:ml-24">

          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={onLeave}
              className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Leave
            </button>
          
            <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className={`flex items-center gap-2 ${turn === player1 ? 'opacity-100' : 'opacity-50'}`}>
                <XIcon className="w-4 h-4" style={{ color: xColor }} />
                <span className="font-medium text-zinc-900 dark:text-white">{player1}</span>
              </div>
              <span className="text-zinc-400 dark:text-zinc-600">vs</span>
              <div className={`flex items-center gap-2 ${turn === player2 ? 'opacity-100' : 'opacity-50'}`}>
                <span className="font-medium text-zinc-900 dark:text-white">{player2}</span>
                <Circle className="w-4 h-4" style={{ color: oColor }} />
              </div>
            </div>
          </div>

          <div className="mb-8 text-center h-8">
            {status === 'playing' && (
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                {isMyTurn ? "It's your turn!" : `Waiting for ${turn}...`}
              </p>
            )}
            {status === 'finished' && winner === currentUser && (
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">You won!</p>
            )}
            {status === 'finished' && winner !== currentUser && winner !== 'draw' && (
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{winner} won!</p>
            )}
            {status === 'finished' && winner === 'draw' && (
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">It's a draw!</p>
            )}
            {status === 'abandoned' && (
              <p className="text-xl font-bold text-zinc-500 dark:text-zinc-400">Opponent left the game.</p>
            )}
          </div>

          <div className="relative mb-8 p-4">
            <div className="grid grid-cols-3 relative">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(renderCell)}
              {winningLine && winningLine.length === 3 && (() => {
                const isHorizontal = Math.floor(winningLine[0] / 3) === Math.floor(winningLine[1] / 3);
                const isVertical = winningLine[0] % 3 === winningLine[1] % 3;
                const isDiagonal1 = winningLine[0] === 0 && winningLine[2] === 8;
                const isDiagonal2 = winningLine[0] === 2 && winningLine[2] === 6;

                let x1, y1, x2, y2;
                const pad = 8;
              
                if (isHorizontal) {
                  y1 = y2 = Math.floor(winningLine[0] / 3) * 33.33 + 16.66;
                  x1 = pad; x2 = 100 - pad;
                } else if (isVertical) {
                  x1 = x2 = (winningLine[0] % 3) * 33.33 + 16.66;
                  y1 = pad; y2 = 100 - pad;
                } else if (isDiagonal1) {
                  x1 = pad; y1 = pad;
                  x2 = 100 - pad; y2 = 100 - pad;
                } else if (isDiagonal2) {
                  x1 = 100 - pad; y1 = pad;
                  x2 = pad; y2 = 100 - pad;
                }

                const winningPiece = gameState.board[winningLine[0]];
                const strokeColor = winningPiece === 'X' ? xColor : oColor;

                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
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
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </svg>
                );
              })()}

              <div className="absolute bottom-0 left-1/2 pointer-events-none z-30">
                <AnimatePresence>
                  {reactions.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 0, scale: 0.4, x: r.x }}
                      animate={{ opacity: [0, 1, 1, 0], y: -160, scale: [0.4, 1.3, 1, 0.9], x: r.x }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, times: [0, 0.15, 0.75, 1], ease: 'easeOut' }}
                      className="absolute -ml-6 -mt-6 flex flex-col items-center"
                    >
                      <span className="text-5xl leading-none drop-shadow-lg">{r.emoji}</span>
                      <span className="mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900/85 text-white whitespace-nowrap">
                        {r.mine ? 'You' : r.from}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {status !== 'playing' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <button
                onClick={onLeave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-xl transition-all"
              >
                Back to Lobby
              </button>
            </motion.div>
          )}

        </div>

        <Chat
          currentUser={currentUser}
          messages={chatMessages}
          locked={status !== 'playing'}
          lockedLabel="This match has ended."
          emptyLabel="Say hello to your opponent."
          onSend={onSendChat}
          reactionEmojis={REACTION_EMOJIS}
          reactionsDisabled={reactionCooldown || status !== 'playing'}
          onSendReaction={handleSendReaction}
          className="w-full max-w-md mx-auto lg:mx-0 lg:w-80 xl:w-96 lg:max-w-none h-[380px] lg:h-auto"
        />
      </div>
    </div>
  );
}
