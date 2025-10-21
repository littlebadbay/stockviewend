import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_TEST = NODE_ENV === 'test';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379';

// Comma-separated list of allowed origins for CORS (e.g., "https://app.vercel.app,https://www.example.com")
// Use "*" to allow all origins (default in development)
export const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || '*';
export const ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

// Feature flag to enable/disable WebSockets at runtime
export const WS_ENABLED = !['false', '0'].includes((process.env.WS_ENABLED || 'true').toLowerCase());
