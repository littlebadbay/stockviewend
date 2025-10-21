import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ indicators: [], message: 'Placeholder - implement indicators' });
});

export default router;
