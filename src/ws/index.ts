import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@/logger';
import { ALLOWED_ORIGINS } from '@/config';

export interface WebSocketContext {
  io: Server;
}

export function initWebSocket(server: HTTPServer): WebSocketContext {
  const io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS
    }
  });

  logger.info({ origins: ALLOWED_ORIGINS }, 'WebSocket server initialized');

  io.on('connection', (socket) => {
    logger.info({ id: socket.id }, 'WS client connected');

    socket.on('echo', (payload) => {
      socket.emit('echo', payload);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ id: socket.id, reason }, 'WS client disconnected');
    });
  });

  return { io };
}
