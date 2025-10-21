import { IS_TEST, REDIS_URL } from '@/config';
import { logger } from '@/logger';
import type { Redis as IRedis } from 'ioredis';

let client: IRedis | null = null;

export function getRedisClient(): IRedis {
  if (client) return client;
  if (IS_TEST) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RedisMock = require('ioredis-mock');
    client = new RedisMock();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    client = new Redis(REDIS_URL);
  }

  client.on('connect', () => logger.info({ msg: 'Redis connected' }));
  client.on('error', (err: unknown) => logger.error({ err }, 'Redis error'));
  return client;
}

export async function redisHealth(): Promise<'connected' | 'disconnected'> {
  try {
    const r = getRedisClient();
    const pong = await r.ping();
    return pong === 'PONG' ? 'connected' : 'disconnected';
  } catch (e) {
    logger.error({ err: e }, 'Redis health check failed');
    return 'disconnected';
  }
}
