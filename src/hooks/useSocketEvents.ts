import { useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import type { UserType, GameState, GameHistory } from '../types';

interface SocketEventHandlers {
  onRegisterSuccess: (data: { username: string }) => void;
  onRegisterError: (msg: string) => void;
  onUsersUpdate: (users: UserType[]) => void;
  onHistoryUpdate: (history: GameHistory[]) => void;
  onInvitationReceived: (data: { from: string }) => void;
  onInvitationDeclined: (data: { by: string }) => void;
  onGameStart: (data: GameState) => void;
  onGameUpdate: (data: GameState) => void;
  onGameAbandoned: () => void;
}

export function useSocketEvents(handlers: SocketEventHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onRegisterSuccess = (data: { username: string }) =>
      handlersRef.current.onRegisterSuccess(data);
    const onRegisterError = (msg: string) =>
      handlersRef.current.onRegisterError(msg);
    const onUsersUpdate = (users: UserType[]) =>
      handlersRef.current.onUsersUpdate(users);
    const onHistoryUpdate = (history: GameHistory[]) =>
      handlersRef.current.onHistoryUpdate(history);
    const onInvitationReceived = (data: { from: string }) =>
      handlersRef.current.onInvitationReceived(data);
    const onInvitationDeclined = (data: { by: string }) =>
      handlersRef.current.onInvitationDeclined(data);
    const onGameStart = (data: GameState) =>
      handlersRef.current.onGameStart(data);
    const onGameUpdate = (data: GameState) =>
      handlersRef.current.onGameUpdate(data);
    const onGameAbandoned = () =>
      handlersRef.current.onGameAbandoned();

    socket.on('register_success', onRegisterSuccess);
    socket.on('register_error', onRegisterError);
    socket.on('users_update', onUsersUpdate);
    socket.on('history_update', onHistoryUpdate);
    socket.on('invitation_received', onInvitationReceived);
    socket.on('invitation_declined', onInvitationDeclined);
    socket.on('game_start', onGameStart);
    socket.on('game_update', onGameUpdate);
    socket.on('game_abandoned', onGameAbandoned);

    return () => {
      socket.off('register_success', onRegisterSuccess);
      socket.off('register_error', onRegisterError);
      socket.off('users_update', onUsersUpdate);
      socket.off('history_update', onHistoryUpdate);
      socket.off('invitation_received', onInvitationReceived);
      socket.off('invitation_declined', onInvitationDeclined);
      socket.off('game_start', onGameStart);
      socket.off('game_update', onGameUpdate);
      socket.off('game_abandoned', onGameAbandoned);
    };
  }, []);
}
