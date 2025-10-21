import { Router } from 'express';
import { redisHealth } from '@/redis/client';

const router = Router();

router.get('/', async (_req, res) => {
  const r = await redisHealth();
  res.json({ status: 'ok', redis: r });
});

export default router;
