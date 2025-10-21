import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ history: [], message: 'Placeholder - implement fetching history' });
});

export default router;
