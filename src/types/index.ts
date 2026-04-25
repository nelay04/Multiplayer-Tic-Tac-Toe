export interface UserType {
  username: string;
  status: 'idle' | 'playing' | 'offline';
}

export interface GameState {
  id: string;
  player1: string;
  player2: string;
  board: (string | null)[];
  turn: string;
  status: 'playing' | 'finished' | 'abandoned';
  winner?: string | null;
  winningLine?: number[];
}

export interface GameHistory {
  _id: string;
  player1: string;
  player2: string;
  board: (string | null)[];
  winningLine?: number[];
  winner: string | null;
  status: string;
  createdAt: string;
  endTime?: string;
}

export type Theme = 'dark' | 'light';
