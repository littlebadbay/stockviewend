import { requestWithRetry } from './base';
import type { SymbolDTO } from '@/marketdata/dto';

export class SinaClient {
  async searchSymbols(query: string): Promise<SymbolDTO[]> {
    // Sina suggest API
    const url = 'https://suggest3.sinajs.cn/suggest/';
    const params = { type: '11,12,13,14,15', key: query };
    const text = await requestWithRetry<string>(url, params);
    // Response format: var suggestvalue="sh600000,浦发银行,....;sz000001,平安银行,...;";
    const m = /suggestvalue="([^"]*)"/.exec(text);
    if (!m) return [];
    const items = m[1].split(';').filter(Boolean);
    return items
      .map((it) => {
        const [prefixed, name] = it.split(',');
        if (!prefixed || !name) return null;
        const p = prefixed.slice(0, 2).toUpperCase();
        const code = prefixed.slice(2);
        const exchange = p === 'SH' ? 'SH' : 'SZ';
        return { symbol: `${code}.${exchange}` as const, name, exchange };
      })
      .filter(Boolean) as SymbolDTO[];
  }
}
