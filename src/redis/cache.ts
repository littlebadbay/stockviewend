import { getRedisClient } from '@/redis/client';

export async function setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const r = getRedisClient();
  const payload = JSON.stringify(value);
  if (ttlSeconds && ttlSeconds > 0) {
    // prefer setex for TTL to ensure compatibility
    await r.setex(key, ttlSeconds, payload);
  } else {
    await r.set(key, payload);
  }
}

export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  const r = getRedisClient();
  const raw = await r.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
