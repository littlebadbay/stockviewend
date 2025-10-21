import http from 'http';
import app from '@/app';
import { initWebSocket } from '@/ws';
import { logger } from '@/logger';
import { PORT } from '@/config';
import { getRedisClient } from '@/redis/client';

const server = http.createServer(app);
initWebSocket(server);

getRedisClient();

server.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});

export default server;
