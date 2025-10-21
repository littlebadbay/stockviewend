export type Exchange = 'SH' | 'SZ';

export function normalizeCode(code: string): string {
  const m = code.replace(/[^0-9]/g, '');
  return m.padStart(6, '0').slice(-6);
}

export function detectExchangeFromSymbol(input: string): Exchange {
  const s = input.toUpperCase();
  if (s.includes('SH')) return 'SH';
  if (s.includes('SZ')) return 'SZ';
  const digits = s.replace(/\D/g, '');
  const first = digits[0];
  if (first === '6') return 'SH';
  return 'SZ';
}

export function parseInputSymbol(input: string): { code: string; exchange: Exchange; secid: string; normalized: string } {
  const exchange = detectExchangeFromSymbol(input);
  const code = normalizeCode(input);
  const secidPrefix = exchange === 'SH' ? '1' : '0';
  const secid = `${secidPrefix}.${code}`;
  const normalized = `${code}.${exchange}`;
  return { code, exchange, secid, normalized };
}

export function intervalToKlt(interval: string): number {
  const map: Record<string, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '60m': 60,
    '1d': 101,
    '1w': 102,
    '1M': 103,
    '1mth': 103,
    '1mo': 103
  };
  const key = interval.trim();
  if (!(key in map)) throw new Error(`Unsupported interval: ${interval}`);
  return map[key];
}
