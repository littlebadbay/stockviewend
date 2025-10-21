import http from 'http';
import app from '@/app';
import { initWebSocket } from '@/ws';
import { logger } from '@/logger';
import { PORT, WS_ENABLED } from '@/config';
import { getRedisClient } from '@/redis/client';

const server = http.createServer(app);

if (WS_ENABLED) {
  initWebSocket(server);
} else {
  logger.info('WebSocket support disabled via WS_ENABLED env var');
}

getRedisClient();

server.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});

export default server;
