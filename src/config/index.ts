import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_TEST = NODE_ENV === 'test';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379';

// Polling configuration
export const POLL_MIN_MS = parseInt(process.env.POLL_MIN_MS || '1000', 10);
export const POLL_MAX_MS = parseInt(process.env.POLL_MAX_MS || '3000', 10);
export const POLL_JITTER_FRAC = parseFloat(process.env.POLL_JITTER_FRAC || '0.1');

// Cache settings
export const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '30', 10);
export const KLINES_WINDOW_SIZE = parseInt(process.env.KLINES_WINDOW_SIZE || '100', 10);

// Backoff settings
export const BACKOFF_BASE_MS = parseInt(process.env.BACKOFF_BASE_MS || '1000', 10);
export const BACKOFF_MAX_MS = parseInt(process.env.BACKOFF_MAX_MS || '30000', 10);
