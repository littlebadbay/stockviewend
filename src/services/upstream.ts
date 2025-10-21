export interface Quote {
  price: number;
  ts: number; // epoch ms
}

export interface KLine {
  open: number;
  high: number;
  low: number;
  close: number;
  ts: number; // epoch ms start
}

export interface UpstreamResponseItem {
  quote: Quote;
  kline?: KLine;
}

export interface UpstreamDataSource {
  fetch(symbols: string[]): Promise<Record<string, UpstreamResponseItem>>;
}

export class FakeUpstream implements UpstreamDataSource {
  public calls: Array<string[]> = [];
  public delayMs: number;
  public shouldFail = false;

  constructor(delayMs = 0) {
    this.delayMs = delayMs;
  }

  async fetch(symbols: string[]): Promise<Record<string, UpstreamResponseItem>> {
    this.calls.push([...symbols]);
    if (this.delayMs) {
      await new Promise((r) => setTimeout(r, this.delayMs));
    }
    if (this.shouldFail) {
      throw new Error('Upstream error');
    }
    const now = Date.now();
    const res: Record<string, UpstreamResponseItem> = {};
    for (const s of symbols) {
      res[s] = {
        quote: { price: Math.random() * 100, ts: now },
        kline: {
          open: Math.random() * 100,
          high: Math.random() * 100,
          low: Math.random() * 100,
          close: Math.random() * 100,
          ts: now - (now % 60000)
        }
      };
    }
    return res;
  }
}
