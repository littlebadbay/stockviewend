import request from 'supertest';
import app from '@/app';

describe('GET /health', () => {
  it('returns ok and redis status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('redis');
  });
});
