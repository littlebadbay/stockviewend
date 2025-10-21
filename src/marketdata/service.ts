import type { KlineDTO, SymbolDTO } from './dto';
import { EastmoneyClient } from './providers/eastmoney';
import { SinaClient } from './providers/sina';
import { TencentClient } from './providers/tencent';

export class MarketDataService {
  constructor(
    private eastmoney = new EastmoneyClient(),
    private tencent = new TencentClient(),
    private sina = new SinaClient()
  ) {}

  async getHistory(symbol: string, interval: string, limit = 200): Promise<KlineDTO[]> {
    try {
      const data = await this.eastmoney.fetchKlines(symbol, interval, limit);
      if (data && data.length) return data;
      // fall through if empty
    } catch (e) {
      // ignore and fallback
    }
    const tencentData = await this.tencent.fetchKlines(symbol, interval, limit);
    if (tencentData && tencentData.length) return tencentData;
    throw new Error('Failed to fetch history from all providers');
  }

  async searchSymbols(query: string): Promise<SymbolDTO[]> {
    try {
      const r = await this.eastmoney.searchSymbols(query);
      if (r && r.length) return r;
    } catch (e) {}

    try {
      const r2 = await this.tencent.searchSymbols(query);
      if (r2 && r2.length) return r2;
    } catch (e) {}

    const r3 = await this.sina.searchSymbols(query);
    return r3;
  }
}

export const marketDataService = new MarketDataService();
