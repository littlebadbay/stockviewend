import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ symbols: [], message: 'Placeholder - implement fetching symbols' });
});

export default router;
