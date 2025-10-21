import request from 'supertest';
import app from '@/app';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GET /history', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it('returns klines from Eastmoney', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('push2his.eastmoney.com')) {
        return Promise.resolve({
          data: {
            data: {
              klines: [
                '2024-01-02,10,10.5,10.8,9.5,12345,1',
                '2024-01-03,10.5,11,11.2,10.2,20000,1'
              ]
            }
          }
        } as any);
      }
      throw new Error('Unexpected url ' + url);
    });

    const res = await request(app).get('/history').query({ symbol: '600000.SH', interval: '1d' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({ open: 10, close: 10.5, high: 10.8, low: 9.5, volume: 12345 })
    );
  });

  it('falls back to Tencent when Eastmoney fails', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('push2his.eastmoney.com')) {
        return Promise.reject(new Error('EM down'));
      }
      if (url.includes('web.ifzq.gtimg.cn')) {
        return Promise.resolve({
          data: {
            data: {
              sh600000: {
                day: [['2024-01-02', '10', '10.5', '10.8', '9.5', '12345']]
              }
            }
          }
        } as any);
      }
      throw new Error('Unexpected url ' + url);
    });

    const res = await request(app).get('/history').query({ symbol: '600000.SH', interval: '1d' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({ open: 10, close: 10.5, high: 10.8, low: 9.5, volume: 12345 })
    );
  });

  it('validates inputs', async () => {
    const res = await request(app).get('/history').query({ symbol: '', interval: '' });
    expect(res.status).toBe(400);
  });
});
