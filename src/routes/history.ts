import { Router } from 'express';
import { marketDataService } from '@/marketdata/service';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const symbol = String(req.query.symbol || '').trim();
    const interval = String(req.query.interval || '').trim();
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 200;

    if (!symbol || !interval) {
      const err: any = new Error('symbol and interval are required');
      err.status = 400;
      throw err;
    }

    const allowed = new Set(['1m', '5m', '15m', '30m', '60m', '1d', '1w', '1M', '1mo']);
    if (!allowed.has(interval)) {
      const err: any = new Error('Unsupported interval');
      err.status = 400;
      throw err;
    }

    const data = await marketDataService.getHistory(symbol, interval, limit);
    res.json({ symbol, interval, data });
  } catch (e) {
    next(e);
  }
});

export default router;
