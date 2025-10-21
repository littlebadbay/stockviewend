import { getRedisClient } from '@/redis/client';
import { getJSON } from '@/redis/cache';
import { PollingScheduler } from '@/services/poller';
import { SubscriptionManager } from '@/services/subscriptions';
import { FakeUpstream } from '@/services/upstream';

function asSet<T>(arr: T[]): Set<T> {
  return new Set(arr);
}

describe('PollingScheduler deduplication', () => {
  beforeEach(async () => {
    const r = getRedisClient();
    await r.flushall();
  });

  it('deduplicates subscribed symbols across clients in a single upstream request', async () => {
    const subs = new SubscriptionManager();
    subs.subscribe('client1', ['AAPL', 'MSFT']);
    subs.subscribe('client2', ['AAPL']);

    const upstream = new FakeUpstream();
    const poller = new PollingScheduler(subs, upstream, { minIntervalMs: 5, maxIntervalMs: 5, ttlSeconds: 2, windowSize: 10 });

    const ran = await poller.pollOnce();
    expect(ran).toBe(true);
    expect(upstream.calls.length).toBe(1);

    const calledSymbols = upstream.calls[0];
    expect(asSet(calledSymbols)).toEqual(asSet(['AAPL', 'MSFT']));

    const quoteAAPL = await getJSON(`quote:AAPL`);
    const quoteMSFT = await getJSON(`quote:MSFT`);
    expect(quoteAAPL).toBeTruthy();
    expect(quoteMSFT).toBeTruthy();

    const klinesAAPL = await getJSON(`klines:AAPL`);
    expect(Array.isArray(klinesAAPL)).toBe(true);
  });

  it('prevents overlapping polls (in-flight dedupe)', async () => {
    const subs = new SubscriptionManager();
    subs.subscribe('client1', ['AAPL']);

    const upstream = new FakeUpstream(100); // add delay to simulate long fetch
    const poller = new PollingScheduler(subs, upstream, { minIntervalMs: 5, maxIntervalMs: 5, ttlSeconds: 2, windowSize: 10 });

    const p1 = poller.pollOnce();
    const p2 = poller.pollOnce();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(true);
    expect(r2).toBe(false); // second call was ignored due to in-flight
    expect(upstream.calls.length).toBe(1);
  });
});
