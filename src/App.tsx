import { useState, useEffect } from 'react';
import { socket } from './lib/socket';
import { useSocketEvents } from './hooks/useSocketEvents';
import Login from './components/Login';
import Lobby from './components/Lobby';
import Game, { ReactionBubble } from './components/Game';
import ComputerGame from './components/ComputerGame';
import Toast, { ToastMessage } from './components/Toast';
import type { UserType, GameState, GameHistory, ChatMessage, Theme } from './types';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'lobby' | 'game' | 'computer'>('login');

  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [reactions, setReactions] = useState<ReactionBubble[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // Transcripts of finished matches, keyed by game id and fetched on demand
  // when a match is opened from the history list.
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [waitingInvites, setWaitingInvites] = useState<string[]>([]);
  const [cooldownInvites, setCooldownInvites] = useState<{ username: string; expiresAt: number }[]>([]);

  const [theme, setTheme] = useState<Theme>('dark');
  const [xColor, setXColor] = useState<string>('#a546f7');
  const [oColor, setOColor] = useState<string>('#ffff08');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const showToast = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const pushReaction = (emoji: string, from: string, mine: boolean) => {
    const id = Date.now() + Math.random();
    const x = (Math.random() - 0.5) * 60;
    setReactions(prev => [...prev, { id, emoji, from, mine, x }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 1800);
  };

  useSocketEvents({
    onRegisterSuccess: (data) => {
      setUsername(data.username);
      setView('lobby');
      setLoginError(null);
    },
    onRegisterError: (msg) => {
      setLoginError(msg);
    },
    onUsersUpdate: (updatedUsers) => {
      setUsers(updatedUsers);
    },
    onHistoryUpdate: (updatedHistory) => {
      setHistory(updatedHistory);
    },
    onInvitationReceived: (data) => {
      showToast(`Game invite received from ${data.from}`);
      setInvitations(prev =>
        prev.includes(data.from) ? prev : [...prev, data.from]
      );
    },
    onInvitationDeclined: (data) => {
      showToast(`${data.by} declined your invitation.`);
      setWaitingInvites(prev => prev.filter(u => u !== data.by));
      setCooldownInvites(prev => [...prev, { username: data.by, expiresAt: Date.now() + 11000 }]);
      setTimeout(() => {
        setCooldownInvites(prev => prev.filter(u => u.username !== data.by));
      }, 11000);
    },
    onGameStart: (data) => {
      showToast('Game started!');
      setGameState(data);
      setReactions([]);
      setChatMessages([]);
      setView('game');
      setInvitations([]);
      setWaitingInvites([]);
    },
    onGameUpdate: (data) => {
      setGameState(data);
    },
    onGameAbandoned: () => {
      setGameState(prev => prev ? { ...prev, status: 'abandoned' } : null);
    },
    onReactionReceived: (data) => {
      pushReaction(data.emoji, data.from, false);
    },
    onChatMessage: (message) => {
      setChatMessages(prev =>
        prev.some(m => m.id === message.id)
          ? prev
          : [...prev, { id: message.id, from: message.from, text: message.text, createdAt: message.createdAt }]
      );
    },
    onChatHistory: ({ gameId, messages }) => {
      setChatHistories(prev => ({ ...prev, [gameId]: messages }));
    },
  });

  const handleLogin = (credentials: { username: string; password: string }) => {
    socket.connect();
    socket.emit('register', credentials);
  };

  const handleLogout = () => {
    socket.disconnect();
    setUsername(null);
    setView('login');
    setUsers([]);
    setInvitations([]);
    setGameState(null);
    setHistory([]);
    setWaitingInvites([]);
    setCooldownInvites([]);
    setReactions([]);
    setChatMessages([]);
    setChatHistories({});
  };

  const handleInvite = (targetUsername: string) => {
    socket.emit('invite', targetUsername);
    setWaitingInvites(prev => [...prev, targetUsername]);
    showToast(`Invite sent to ${targetUsername}`);
  };

  const handleAcceptInvite = (fromUsername: string) => {
    socket.emit('accept_invite', fromUsername);
    setInvitations(prev => prev.filter(u => u !== fromUsername));
  };

  const handleDeclineInvite = (fromUsername: string) => {
    socket.emit('decline_invite', fromUsername);
    setInvitations(prev => prev.filter(u => u !== fromUsername));
  };

  const handleMakeMove = (index: number) => {
    if (gameState?.id) {
      socket.emit('make_move', { gameId: gameState.id, index });
    }
  };

  const handleLeaveGame = () => {
    if (gameState?.id) {
      socket.emit('leave_game', gameState.id);
    }
    setGameState(null);
    setReactions([]);
    setChatMessages([]);
    setView('lobby');
  };

  const handleSendReaction = (emoji: string) => {
    if (!gameState?.id || !username) return;
    socket.emit('send_reaction', { gameId: gameState.id, emoji });
    pushReaction(emoji, username, true);
  };

  // The sent message is not rendered optimistically: the server echoes it back
  // to both players so ids and ordering come from a single source.
  const handleSendChat = (text: string) => {
    if (!gameState?.id) return;
    socket.emit('send_chat', { gameId: gameState.id, text });
  };

  const handleLoadChatHistory = (gameId: string) => {
    socket.emit('get_chat_history', gameId);
  };

  return (
    <>
      {view === 'login' && (
        <Login onLogin={handleLogin} error={loginError} />
      )}
      {view === 'lobby' && username && (
        <Lobby
          currentUser={username}
          users={users}
          invitations={invitations}
          history={history}
          chatHistories={chatHistories}
          onLoadChatHistory={handleLoadChatHistory}
          waitingInvites={waitingInvites}
          cooldownInvites={cooldownInvites}
          theme={theme}
          setTheme={setTheme}
          xColor={xColor}
          setXColor={setXColor}
          oColor={oColor}
          setOColor={setOColor}
          onInvite={handleInvite}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
          onPlayComputer={() => setView('computer')}
          onLogout={handleLogout}
        />
      )}
      {view === 'game' && username && gameState && (
        <Game
          currentUser={username}
          gameState={gameState}
          xColor={xColor}
          oColor={oColor}
          reactions={reactions}
          chatMessages={chatMessages}
          onMakeMove={handleMakeMove}
          onLeave={handleLeaveGame}
          onSendReaction={handleSendReaction}
          onSendChat={handleSendChat}
        />
      )}
      {view === 'computer' && (
        <ComputerGame
          onLeave={() => setView('lobby')}
          xColor={xColor}
          oColor={oColor}
        />
      )}
      <Toast toasts={toasts} />
    </>
  );
}
