import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_TEST = NODE_ENV === 'test';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379';
