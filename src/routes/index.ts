import { Router } from 'express';
import health from './health';
import symbols from './symbols';
import history from './history';
import indicators from './indicators';
import predict from './predict';

const router = Router();

router.use('/health', health);
router.use('/symbols', symbols);
router.use('/history', history);
router.use('/indicators', indicators);
router.use('/predict', predict);

export default router;
