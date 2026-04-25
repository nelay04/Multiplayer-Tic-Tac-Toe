import { io } from 'socket.io-client';

// In development, we connect to the same host/port.
// In production, it will also be the same.
export const socket = io({
  autoConnect: false
});
