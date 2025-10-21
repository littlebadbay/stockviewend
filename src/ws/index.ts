import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@/logger';

export interface WebSocketContext {
  io: Server;
}

export function initWebSocket(server: HTTPServer): WebSocketContext {
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

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
