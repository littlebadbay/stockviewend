import type { Server as HTTPServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { logger } from '@/logger';

export interface WSOptions {
  updateIntervalMinMs?: number;
  updateIntervalMaxMs?: number;
  defaultThrottleMs?: number;
  maxClientQueueSize?: number;
  authToken?: string | null;
}

export interface WebSocketContext {
  io: Server;
}

type IndicatorKey = 'sma' | 'ema' | 'rsi';

interface SubscribePayload {
  symbols: string[];
  indicators?: IndicatorKey[];
  throttleMs?: number;
  // test-only: simulate per-client send latency (ms)
  simulateLatencyMs?: number;
}

interface UnsubscribePayload {
  symbols: string[];
}

interface UpdatePayload {
  type: 'update';
  symbol: string;
  ts: number;
  price: number;
  indicators?: Partial<Record<IndicatorKey, number>>;
}

interface ClientState {
  id: string;
  socket: Socket;
  subscriptions: Map<string, Set<IndicatorKey>>; // symbol -> indicator set requested
  throttleMs: number;
  lastSentBySymbol: Map<string, number>;
  queue: UpdatePayload[];
  sending: boolean;
  simulateLatencyMs: number;
  maxQueueSize: number;
  delivered: number;
  dropped: number;
}

// Symbol feed scheduler
class SymbolFeed {
  symbol: string;
  private timer: NodeJS.Timeout | null = null;
  private prices: number[] = [];
  private price: number;
  private readonly minMs: number;
  private readonly maxMs: number;
  private readonly onTick: (symbol: string, update: { price: number; ts: number; indicators: Record<IndicatorKey, number> }) => void;

  constructor(options: {
    symbol: string;
    minMs: number;
    maxMs: number;
    onTick: (symbol: string, update: { price: number; ts: number; indicators: Record<IndicatorKey, number> }) => void;
  }) {
    this.symbol = options.symbol;
    this.minMs = options.minMs;
    this.maxMs = options.maxMs;
    this.onTick = options.onTick;
    // initialize around 100 plus random
    this.price = 100 + Math.random() * 50;
  }

  private nextDelay(): number {
    const { minMs, maxMs } = this;
    return Math.floor(minMs + Math.random() * (maxMs - minMs));
  }

  private computeIndicators(): Record<IndicatorKey, number> {
    // Keep last 20 prices
    this.prices.push(this.price);
    if (this.prices.length > 20) this.prices.shift();

    const smaWindow = 5;
    const last = this.prices.slice(-smaWindow);
    const sma = last.reduce((a, b) => a + b, 0) / last.length;

    // Simple EMA approximation using alpha=2/(n+1) with n=5
    const alpha = 2 / (smaWindow + 1);
    let ema = this.prices[0] || this.price;
    for (let i = 1; i < this.prices.length; i++) {
      ema = alpha * this.prices[i] + (1 - alpha) * ema;
    }

    // RSI placeholder: compute gains/losses over last 14 steps
    const rsiWindow = 14;
    const p = this.prices.slice(-rsiWindow);
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < p.length; i++) {
      const diff = p[i] - p[i - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / (losses || 1);
    const rsi = 100 - 100 / (1 + rs);

    return { sma, ema, rsi };
  }

  private schedule() {
    const delay = this.nextDelay();
    this.timer = setTimeout(() => {
      // random walk price
      const delta = (Math.random() - 0.5) * 2; // -1..1
      this.price = Math.max(1, this.price + delta);
      const indicators = this.computeIndicators();
      const ts = Date.now();
      try {
        this.onTick(this.symbol, { price: this.price, ts, indicators });
      } catch (e) {
        logger.error({ err: e }, 'Error in feed onTick');
      }
      this.schedule();
    }, delay);
  }

  start() {
    if (this.timer) return;
    this.schedule();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export function initWebSocket(server: HTTPServer, options?: WSOptions): WebSocketContext {
  const updateIntervalMinMs = options?.updateIntervalMinMs ?? 1000;
  const updateIntervalMaxMs = options?.updateIntervalMaxMs ?? 3000;
  const defaultThrottleMs = options?.defaultThrottleMs ?? 1000;
  const maxClientQueueSize = options?.maxClientQueueSize ?? 100;
  const authToken = options?.authToken ?? (process.env.WS_AUTH_TOKEN || null);

  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Optional auth via token (disabled by default)
  if (authToken) {
    io.use((socket, next) => {
      const provided =
        (socket.handshake.auth && (socket.handshake.auth as any).token) ||
        (socket.handshake.query && typeof (socket.handshake.query as any).token === 'string'
          ? ((socket.handshake.query as any).token as string)
          : null) ||
        (typeof socket.handshake.headers.authorization === 'string'
          ? (socket.handshake.headers.authorization as string).replace(/^Bearer\s+/i, '')
          : null);

      if (!provided || provided !== authToken) {
        return next(new Error('Unauthorized'));
      }
      return next();
    });
  }

  const clients = new Map<string, ClientState>();
  const subscribersBySymbol = new Map<string, Set<string>>(); // symbol -> set of socket ids
  const feeds = new Map<string, SymbolFeed>();

  function ensureFeed(symbol: string) {
    if (feeds.has(symbol)) return feeds.get(symbol)!;
    const feed = new SymbolFeed({
      symbol,
      minMs: updateIntervalMinMs,
      maxMs: updateIntervalMaxMs,
      onTick: (sym, upd) => broadcast(sym, upd)
    });
    feeds.set(symbol, feed);
    feed.start();
    return feed;
  }

  function maybeStopFeed(symbol: string) {
    const subs = subscribersBySymbol.get(symbol);
    if (!subs || subs.size === 0) {
      const feed = feeds.get(symbol);
      if (feed) feed.stop();
      feeds.delete(symbol);
    }
  }

  function pickIndicators(all: Record<IndicatorKey, number>, wanted?: Set<IndicatorKey>) {
    if (!wanted || wanted.size === 0) return undefined;
    const out: Partial<Record<IndicatorKey, number>> = {};
    wanted.forEach((k) => {
      out[k] = all[k];
    });
    return out;
  }

  function enqueueOrSend(client: ClientState, msg: UpdatePayload) {
    // Throttle per symbol
    const last = client.lastSentBySymbol.get(msg.symbol) || 0;
    if (Date.now() - last < client.throttleMs) {
      return; // throttled skip
    }

    if (client.queue.length >= client.maxQueueSize) {
      client.dropped++;
      return; // backpressure drop
    }

    client.queue.push(msg);
    tryDrain(client);
  }

  function tryDrain(client: ClientState) {
    if (client.sending) return;
    const next = client.queue.shift();
    if (!next) return;
    client.sending = true;

    const doSend = () => {
      client.socket.emit('update', next);
      client.delivered++;
      client.lastSentBySymbol.set(next.symbol, Date.now());
      client.sending = false;
      // Continue draining
      setImmediate(() => tryDrain(client));
    };

    if (client.simulateLatencyMs > 0) {
      setTimeout(doSend, client.simulateLatencyMs);
    } else {
      doSend();
    }
  }

  function broadcast(symbol: string, upd: { price: number; ts: number; indicators: Record<IndicatorKey, number> }) {
    const ids = subscribersBySymbol.get(symbol);
    if (!ids || ids.size === 0) return;

    ids.forEach((id) => {
      const c = clients.get(id);
      if (!c) return;
      const wanted = c.subscriptions.get(symbol);
      const msg: UpdatePayload = {
        type: 'update',
        symbol,
        ts: upd.ts,
        price: upd.price,
        indicators: pickIndicators(upd.indicators, wanted)
      };
      enqueueOrSend(c, msg);
    });
  }

  io.on('connection', (socket) => {
    logger.info({ id: socket.id }, 'WS client connected');

    const clientState: ClientState = {
      id: socket.id,
      socket,
      subscriptions: new Map(),
      throttleMs: defaultThrottleMs,
      lastSentBySymbol: new Map(),
      queue: [],
      sending: false,
      simulateLatencyMs: 0,
      maxQueueSize: maxClientQueueSize,
      delivered: 0,
      dropped: 0
    };

    clients.set(socket.id, clientState);

    socket.on('echo', (payload) => {
      socket.emit('echo', payload);
    });

    socket.on('subscribe', (payload: SubscribePayload) => {
      try {
        if (!payload || !Array.isArray(payload.symbols) || payload.symbols.length === 0) {
          socket.emit('error', { message: 'Invalid subscribe payload' });
          return;
        }
        const indicators = new Set<IndicatorKey>((payload.indicators || []) as IndicatorKey[]);

        if (typeof payload.throttleMs === 'number' && payload.throttleMs >= 0) {
          clientState.throttleMs = payload.throttleMs;
        }
        if (typeof payload.simulateLatencyMs === 'number' && payload.simulateLatencyMs >= 0) {
          clientState.simulateLatencyMs = payload.simulateLatencyMs;
        }

        const added: string[] = [];
        for (const sym of payload.symbols) {
          const cur = subscribersBySymbol.get(sym) || new Set<string>();
          cur.add(socket.id);
          subscribersBySymbol.set(sym, cur);
          ensureFeed(sym);
          clientState.subscriptions.set(sym, indicators);
          added.push(sym);
        }
        socket.emit('subscribed', { symbols: added, indicators: Array.from(indicators) });
      } catch (e) {
        logger.error({ err: e }, 'Error handling subscribe');
      }
    });

    socket.on('unsubscribe', (payload: UnsubscribePayload) => {
      try {
        if (!payload || !Array.isArray(payload.symbols)) return;
        const removed: string[] = [];
        for (const sym of payload.symbols) {
          const subs = subscribersBySymbol.get(sym);
          if (subs) subs.delete(socket.id);
          clientState.subscriptions.delete(sym);
          removed.push(sym);
          maybeStopFeed(sym);
        }
        socket.emit('unsubscribed', { symbols: removed });
      } catch (e) {
        logger.error({ err: e }, 'Error handling unsubscribe');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ id: socket.id, reason }, 'WS client disconnected');
      // cleanup
      const syms = Array.from(clientState.subscriptions.keys());
      for (const sym of syms) {
        const subs = subscribersBySymbol.get(sym);
        if (subs) subs.delete(socket.id);
        maybeStopFeed(sym);
      }
      clients.delete(socket.id);
    });
  });

  return { io };
}
