import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  CACHE_TTL_SECONDS,
  KLINES_WINDOW_SIZE,
  POLL_MAX_MS,
  POLL_MIN_MS
} from '@/config';
import { getJSON, setJSON } from '@/redis/cache';
import type { KLine, UpstreamDataSource } from '@/services/upstream';
import { SubscriptionManager } from '@/services/subscriptions';

export interface PollerOptions {
  minIntervalMs?: number;
  maxIntervalMs?: number;
  ttlSeconds?: number;
  windowSize?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
}

interface BackoffState {
  attempt: number;
  nextAllowed: number; // epoch ms when next fetch is allowed
}

export class PollingScheduler {
  private inFlight = false;
  private timer: NodeJS.Timeout | null = null;
  private backoff: Map<string, BackoffState> = new Map();

  private readonly minIntervalMs: number;
  private readonly maxIntervalMs: number;
  private readonly ttlSeconds: number;
  private readonly windowSize: number;
  private readonly backoffBaseMs: number;
  private readonly backoffMaxMs: number;

  constructor(
    private readonly subs: SubscriptionManager,
    private readonly upstream: UpstreamDataSource,
    opts: PollerOptions = {}
  ) {
    this.minIntervalMs = opts.minIntervalMs ?? POLL_MIN_MS;
    this.maxIntervalMs = opts.maxIntervalMs ?? POLL_MAX_MS;
    this.ttlSeconds = opts.ttlSeconds ?? CACHE_TTL_SECONDS;
    this.windowSize = opts.windowSize ?? KLINES_WINDOW_SIZE;
    this.backoffBaseMs = opts.backoffBaseMs ?? BACKOFF_BASE_MS;
    this.backoffMaxMs = opts.backoffMaxMs ?? BACKOFF_MAX_MS;
  }

  private calcNextInterval(): number {
    if (this.maxIntervalMs <= this.minIntervalMs) return this.minIntervalMs;
    const delta = this.maxIntervalMs - this.minIntervalMs;
    return this.minIntervalMs + Math.floor(Math.random() * (delta + 1));
  }

  start(): void {
    if (this.timer) return;
    const tick = async () => {
      try {
        await this.pollOnce();
      } finally {
        const next = this.calcNextInterval();
        this.timer = setTimeout(tick, next);
      }
    };
    this.timer = setTimeout(tick, this.calcNextInterval());
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async pollOnce(): Promise<boolean> {
    if (this.inFlight) return false; // dedupe concurrent polls
    this.inFlight = true;
    try {
      const allSymbols = Array.from(this.subs.getAllSymbols());
      const now = Date.now();
      const eligible = allSymbols.filter((s) => {
        const b = this.backoff.get(s);
        return !b || now >= b.nextAllowed;
      });

      if (eligible.length === 0) return false;

      let res: Awaited<ReturnType<UpstreamDataSource['fetch']>> | null = null;
      try {
        res = await this.upstream.fetch(eligible);
      } catch (_err) {
        // Apply backoff to all eligible symbols
        for (const s of eligible) this.bumpBackoff(s);
        return false;
      }

      for (const s of eligible) {
        const item = res[s];
        if (!item) continue;
        // quote
        await setJSON(`quote:${s}`, item.quote, this.ttlSeconds);

        // klines sliding window
        if (item.kline) {
          const key = `klines:${s}`;
          const existing = (await getJSON<KLine[]>(key)) || [];
          const merged = this.mergeKLines(existing, item.kline, this.windowSize);
          await setJSON(key, merged, this.ttlSeconds);
        }

        // success -> reset backoff
        this.backoff.delete(s);
      }

      return true;
    } finally {
      this.inFlight = false;
    }
  }

  private bumpBackoff(symbol: string) {
    const prev = this.backoff.get(symbol) || { attempt: 0, nextAllowed: 0 };
    const attempt = prev.attempt + 1;
    const wait = Math.min(this.backoffBaseMs * Math.pow(2, attempt - 1), this.backoffMaxMs);
    this.backoff.set(symbol, { attempt, nextAllowed: Date.now() + wait });
  }

  private mergeKLines(existing: KLine[], next: KLine, windowSize: number): KLine[] {
    const out = existing.slice();
    const last = out[out.length - 1];
    if (!last || last.ts !== next.ts) {
      out.push(next);
    } else {
      out[out.length - 1] = next;
    }
    // ensure unique by ts and limit size
    const dedupMap = new Map<number, KLine>();
    for (const k of out) dedupMap.set(k.ts, k);
    const arr = Array.from(dedupMap.keys())
      .sort((a, b) => a - b)
      .map((ts) => dedupMap.get(ts)!)
      .slice(-windowSize);
    return arr;
  }
}
