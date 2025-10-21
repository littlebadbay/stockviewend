import { Router } from 'express';
import { marketDataService } from '@/marketdata/service';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    if (!search) {
      const err: any = new Error('search is required');
      err.status = 400;
      throw err;
    }
    const results = await marketDataService.searchSymbols(search);
    res.json({ symbols: results });
  } catch (e) {
    next(e);
  }
});

export default router;
