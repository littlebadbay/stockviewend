import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ prediction: null, message: 'Placeholder - implement prediction' });
});

export default router;
