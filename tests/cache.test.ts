import { getRedisClient } from '@/redis/client';
import { getJSON, setJSON } from '@/redis/cache';

describe('Redis JSON cache helpers with TTL', () => {
  beforeEach(async () => {
    const r = getRedisClient();
    await r.flushall();
  });

  it('sets and gets JSON with TTL', async () => {
    const key = 'test:obj';
    await setJSON(key, { a: 1, b: 'x' }, 1);

    const v1 = await getJSON<{ a: number; b: string }>(key);
    expect(v1).toEqual({ a: 1, b: 'x' });

    await new Promise((r) => setTimeout(r, 1200));

    const v2 = await getJSON(key);
    expect(v2).toBeNull();
  });
});
