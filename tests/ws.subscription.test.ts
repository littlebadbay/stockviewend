import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import app from '@/app';
import { initWebSocket } from '@/ws';

function getUrl(server: http.Server) {
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('No address');
  return `http://localhost:${addr.port}`;
}

describe('WS subscribe/broadcast with throttle and backpressure', () => {
  let server: http.Server;

  beforeAll((done) => {
    server = http.createServer(app);
    initWebSocket(server, {
      updateIntervalMinMs: 10,
      updateIntervalMaxMs: 15,
      defaultThrottleMs: 0,
      maxClientQueueSize: 3
    });
    server.listen(0, () => done());
  });

  afterAll((done) => {
    server.close(() => done());
  });

  it('broadcasts updates to multiple subscribers, slow client gets fewer due to backpressure', (done) => {
    const url = getUrl(server);

    const fast: Socket = Client(url);
    const slow: Socket = Client(url);

    let fastCount = 0;
    let slowCount = 0;

    const stop = () => {
      fast.close();
      slow.close();
    };

    fast.on('connect', () => {
      fast.emit('subscribe', { symbols: ['AAPL'], throttleMs: 0 });
    });

    slow.on('connect', () => {
      slow.emit('subscribe', { symbols: ['AAPL'], throttleMs: 0, simulateLatencyMs: 50 });
    });

    fast.on('update', () => {
      fastCount++;
    });

    slow.on('update', () => {
      slowCount++;
    });

    setTimeout(() => {
      try {
        expect(fastCount).toBeGreaterThan(0);
        expect(slowCount).toBeGreaterThan(0);
        expect(fastCount).toBeGreaterThan(slowCount);
        stop();
        done();
      } catch (e) {
        stop();
        done(e);
      }
    }, 800);
  });

  it('unsubscribe stops further updates', (done) => {
    const url = getUrl(server);
    const client: Socket = Client(url);

    let count = 0;
    let lastCount = 0;

    const symbol = 'MSFT';

    client.on('connect', () => {
      client.emit('subscribe', { symbols: [symbol], throttleMs: 0 });
    });

    client.on('update', (msg) => {
      if (msg.symbol === symbol) count++;
    });

    setTimeout(() => {
      client.emit('unsubscribe', { symbols: [symbol] });
      lastCount = count;
    }, 300);

    setTimeout(() => {
      try {
        expect(lastCount).toBeGreaterThan(0);
        expect(count).toBe(lastCount);
        client.close();
        done();
      } catch (e) {
        client.close();
        done(e);
      }
    }, 800);
  });

  it('includes only requested indicator sets', (done) => {
    const url = getUrl(server);
    const client: Socket = Client(url);

    const symbol = 'TSLA';

    client.on('connect', () => {
      client.emit('subscribe', { symbols: [symbol], indicators: ['sma'] });
    });

    client.on('update', (msg) => {
      try {
        if (msg.symbol !== symbol) return;
        expect(msg).toHaveProperty('price');
        expect(msg.indicators).toBeDefined();
        expect(msg.indicators.sma).toBeDefined();
        // only requested indicator should be included
        expect(msg.indicators.ema).toBeUndefined();
        expect(msg.indicators.rsi).toBeUndefined();
        client.close();
        done();
      } catch (e) {
        client.close();
        done(e);
      }
    });
  });
});
