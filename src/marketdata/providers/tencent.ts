import { requestWithRetry, ProviderError } from './base';
import type { KlineDTO, SymbolDTO } from '@/marketdata/dto';
import { parseInputSymbol } from '@/utils/symbol';

export class TencentClient {
  async fetchKlines(symbol: string, interval: string, limit = 200): Promise<KlineDTO[]> {
    // Tencent supports day/week/month and minute via different keys; we'll map simple daily here and minute by interval name
    const { exchange, code } = parseInputSymbol(symbol);
    const marketPrefix = exchange === 'SH' ? 'sh' : 'sz';
    const url = 'https://web.ifzq.gtimg.cn/appstock/app/kline/kline';
    let period = 'day';
    if (interval.endsWith('w')) period = 'week';
    else if (interval.toLowerCase().startsWith('1m') && interval !== '1mo') period = 'min';
    else if (interval.toLowerCase().includes('mo') || interval === '1M') period = 'month';

    const params: Record<string, string | number> = {
      param: `${marketPrefix}${code},${period},,,${limit}`
    };
    const data = await requestWithRetry<any>(url, params);
    const key = `${marketPrefix}${code}`;
    const series =
      data?.data?.[key]?.[period] || data?.data?.[key]?.kline || data?.data?.[key]?.day || [];
    if (!Array.isArray(series)) throw new ProviderError('Invalid Tencent klines response');
    // Entry format: [date, open, close, high, low, volume]
    return series.map((row: any[]) => {
      const [d, open, close, high, low, volume] = row;
      const ts = Date.parse(String(d).replace(/\./g, '-'));
      return {
        timestamp: isNaN(ts) ? Date.now() : ts,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume)
      };
    });
  }

  async searchSymbols(_query: string): Promise<SymbolDTO[]> {
    // Not implemented robustly; prefer Eastmoney/Sina for search. Return empty to allow fallback chain continue.
    return [];
  }
}
