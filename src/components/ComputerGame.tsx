import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Circle, ArrowLeft, Settings2 } from 'lucide-react';

interface ComputerGameProps {
  onLeave: () => void;
  xColor: string;
  oColor: string;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function ComputerGame({ onLeave, xColor, oColor }: ComputerGameProps) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [status, setStatus] = useState<'playing' | 'finished'>('playing');
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const checkWin = (currentBoard: (string | null)[]) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { isWin: true, winner: currentBoard[a], line: pattern };
      }
    }
    
    if (!currentBoard.includes(null)) {
      return { isWin: false, isDraw: true };
    }
    
    return { isWin: false, isDraw: false };
  };

  const minimax = (newBoard: (string | null)[], depth: number, isMaximizing: boolean): number => {
    const result = checkWin(newBoard);
    if (result.isWin) {
      return result.winner === 'O' ? 10 - depth : depth - 10;
    } else if (result.isDraw) {
      return 0;
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === null) {
          newBoard[i] = 'O';
          const score = minimax(newBoard, depth + 1, false);
          newBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === null) {
          newBoard[i] = 'X';
          const score = minimax(newBoard, depth + 1, true);
          newBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (currentBoard: (string | null)[]) => {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = 'O';
        const score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  const getRandomMove = (currentBoard: (string | null)[]) => {
    const availableSpots = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    if (availableSpots.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableSpots.length);
      return availableSpots[randomIndex];
    }
    return -1;
  };

  const makeMove = (index: number) => {
    if (board[index] || status !== 'playing' || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsPlayerTurn(false);

    const winCheck = checkWin(newBoard);
    if (winCheck.isWin) {
      setStatus('finished');
      setWinner('Player');
      setWinningLine(winCheck.line!);
    } else if (winCheck.isDraw) {
      setStatus('finished');
      setWinner('draw');
    }
  };

  useEffect(() => {
    if (!isPlayerTurn && status === 'playing') {
      const timer = setTimeout(() => {
        let move = -1;
        
        if (difficulty === 'easy') {
          move = getRandomMove(board);
        } else if (difficulty === 'hard') {
          move = getBestMove([...board]);
        } else {
          // Medium: 50% chance of best move, 50% chance of random move
          if (Math.random() > 0.5) {
            move = getBestMove([...board]);
          } else {
            move = getRandomMove(board);
          }
        }
        
        if (move !== -1) {
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);
          setIsPlayerTurn(true);

          const winCheck = checkWin(newBoard);
          if (winCheck.isWin) {
            setStatus('finished');
            setWinner('Computer');
            setWinningLine(winCheck.line!);
          } else if (winCheck.isDraw) {
            setStatus('finished');
            setWinner('draw');
          }
        }
      }, 600); // slight delay for realism
      
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, board, status, difficulty]);

  const renderCell = (index: number) => {
    const value = board[index];
    const isWinningCell = winningLine.includes(index);
    
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
        onClick={() => makeMove(index)}
        disabled={value !== null || !isPlayerTurn || status !== 'playing'}
        className={`
          h-24 sm:h-32 flex items-center justify-center text-5xl transition-all
          ${borderClasses}
          ${!value && isPlayerTurn ? 'hover:bg-zinc-800/50 cursor-pointer' : ''}
          ${!value && !isPlayerTurn ? 'cursor-not-allowed' : ''}
        `}
      >
        {value === 'X' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: xColor }}>
            <X className="w-16 h-16" strokeWidth={2.5} />
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
      <div className="w-full max-w-md">
        
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onLeave}
            className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Leave
          </button>
          
          <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className={`flex items-center gap-2 ${isPlayerTurn ? 'opacity-100' : 'opacity-50'}`}>
              <X className="w-4 h-4" style={{ color: xColor }} />
              <span className="font-medium text-zinc-900 dark:text-white">You</span>
            </div>
            <span className="text-zinc-400 dark:text-zinc-600">vs</span>
            <div className={`flex items-center gap-2 ${!isPlayerTurn ? 'opacity-100' : 'opacity-50'}`}>
              <span className="font-medium text-zinc-900 dark:text-white">Computer</span>
              <Circle className="w-4 h-4" style={{ color: oColor }} />
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-center items-center gap-3 bg-white dark:bg-zinc-900/50 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <Settings2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${
                  difficulty === level 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8 text-center h-8">
          {status === 'playing' && (
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
              {isPlayerTurn ? "It's your turn!" : "Computer is thinking..."}
            </p>
          )}
          {status === 'finished' && winner === 'Player' && (
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">You won!</p>
          )}
          {status === 'finished' && winner === 'Computer' && (
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">Computer won!</p>
          )}
          {status === 'finished' && winner === 'draw' && (
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">It's a draw!</p>
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

              const winningPiece = board[winningLine[0]];
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
          </div>
        </div>

        {status !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4"
          >
            <button
              onClick={() => {
                setBoard(Array(9).fill(null));
                setStatus('playing');
                setWinner(null);
                setWinningLine([]);
                setIsPlayerTurn(true);
              }}
              className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium px-6 py-3 rounded-xl transition-all"
            >
              Play Again
            </button>
            <button
              onClick={onLeave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-all"
            >
              Back to Lobby
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
