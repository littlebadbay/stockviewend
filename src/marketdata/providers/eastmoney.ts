import { requestWithRetry, ProviderError } from './base';
import type { KlineDTO, QuoteDTO, SymbolDTO } from '@/marketdata/dto';
import { intervalToKlt, parseInputSymbol } from '@/utils/symbol';

export class EastmoneyClient {
  async fetchQuote(symbol: string): Promise<QuoteDTO> {
    const { secid, normalized } = parseInputSymbol(symbol);
    const url = 'https://push2.eastmoney.com/api/qt/stock/get';
    const params = {
      invt: 2,
      fltt: 2,
      secid,
      fields:
        'f43,f44,f45,f46,f47,f48,f50,f51,f52,f57,f58,f60,f84,f85,f86,f530,f152' // price, high, low, open, prev close, vol etc
    };
    const data = await requestWithRetry<any>(url, params);
    const d = data?.data;
    if (!d) throw new ProviderError('Invalid Eastmoney quote response');

    // Field mapping, guarded with fallbacks
    const price = num(d.f43);
    const high = num(d.f44);
    const low = num(d.f45);
    const open = num(d.f46);
    const prevClose = num(d.f60);
    const volume = num(d.f47 || d.f48 || d.f84);
    const change = isFiniteNum(price) && isFiniteNum(prevClose) ? price - prevClose : undefined;
    const changePercent =
      isFiniteNum(price) && isFiniteNum(prevClose) && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : undefined;

    return {
      symbol: normalized,
      name: d.f58,
      price,
      change,
      changePercent,
      open,
      high,
      low,
      prevClose,
      volume,
      time: Date.now()
    };
  }

  async fetchKlines(symbol: string, interval: string, limit = 200): Promise<KlineDTO[]> {
    const { secid } = parseInputSymbol(symbol);
    const klt = intervalToKlt(interval);
    const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
    const params = {
      secid,
      klt,
      fqt: 1,
      end: '20500101',
      lmt: limit,
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58'
    };
    const data = await requestWithRetry<any>(url, params);
    const kl = data?.data?.klines;
    if (!Array.isArray(kl)) throw new ProviderError('Invalid Eastmoney klines response');
    return kl.map((row: string) => parseEastmoneyKlineRow(row));
  }

  async searchSymbols(query: string): Promise<SymbolDTO[]> {
    const url = 'https://searchapi.eastmoney.com/api/suggest/get';
    const params = { input: query, type: 14 };
    const data = await requestWithRetry<any>(url, params);
    const items: any[] = data?.QuotationCodeTable?.Data || data?.data || [];
    if (!Array.isArray(items)) return [];
    return items
      .map((it) => {
        const code = (it.Code || it.code || '').toString();
        const name = (it.Name || it.name || '').toString();
        const mt = (it.MarketType || it.marketType || it.Market || '').toString();
        const exchange = mt === '1' || mt === 1 ? 'SH' : 'SZ';
        if (!code || !name) return null;
        return { symbol: `${code}.${exchange}` as const, name, exchange: exchange as 'SH' | 'SZ' };
      })
      .filter(Boolean) as SymbolDTO[];
  }
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function parseEastmoneyKlineRow(row: string) {
  // Formats:
  // Daily: YYYY-MM-DD,open,close,high,low,volume,amount,amplitude,chg,chgPct,turnover
  // Minute: YYYY-MM-DD HH:MM,open,close,high,low,volume,amount
  const parts = row.split(',');
  const dateStr = parts[0];
  const open = Number(parts[1]);
  const close = Number(parts[2]);
  const high = Number(parts[3]);
  const low = Number(parts[4]);
  const volume = Number(parts[5]);
  const ts = Date.parse(dateStr.replace(/\./g, '-'));
  return { timestamp: isNaN(ts) ? Date.now() : ts, open, high, low, close, volume };
}
