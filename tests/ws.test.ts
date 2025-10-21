import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import app from '@/app';
import { initWebSocket } from '@/ws';

function getAddress(port: number) {
  return `http://localhost:${port}`;
}

describe('WebSocket echo', () => {
  let server: http.Server;

  beforeAll((done) => {
    server = http.createServer(app);
    initWebSocket(server);
    server.listen(0, () => done());
  });

  afterAll((done) => {
    server.close(() => done());
  });

  it('echoes messages via "echo" event', (done) => {
    const addressInfo = server.address();
    if (!addressInfo || typeof addressInfo === 'string') throw new Error('No address');
    const url = getAddress(addressInfo.port);

    const client: Socket = Client(url);

    client.on('connect', () => {
      client.emit('echo', { hello: 'world' });
    });

    client.on('echo', (payload) => {
      expect(payload).toEqual({ hello: 'world' });
      client.close();
      done();
    });

    client.on('connect_error', (err) => {
      done(err);
    });
  });
});
