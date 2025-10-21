import { Router } from 'express';
import { getRedisClient } from '@/redis/client';

const router = Router();

// Simple caching demo: returns the current time, cached for `ttl` seconds
router.get('/time', async (req, res) => {
  const ttl = Math.max(1, parseInt(String(req.query.ttl || '10'), 10));
  const key = 'cache:time';
  const client = getRedisClient();

  let fromCache = true;
  let value = await client.get(key);
  if (!value) {
    fromCache = false;
    value = new Date().toISOString();
    await client.set(key, value, 'EX', ttl);
  }

  res.json({
    value,
    fromCache,
    ttl
  });
});

export default router;
