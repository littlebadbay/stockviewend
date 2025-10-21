import request from 'supertest';
import app from '@/app';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GET /symbols', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it('returns symbols from Eastmoney', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('searchapi.eastmoney.com')) {
        return Promise.resolve({
          data: {
            QuotationCodeTable: {
              Data: [
                { Code: '600000', Name: '浦发银行', MarketType: '1' },
                { Code: '000001', Name: '平安银行', MarketType: '0' }
              ]
            }
          }
        } as any);
      }
      throw new Error('Unexpected url ' + url);
    });

    const res = await request(app).get('/symbols').query({ search: '银行' });
    expect(res.status).toBe(200);
    expect(res.body.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: '600000.SH', name: '浦发银行' }),
        expect.objectContaining({ symbol: '000001.SZ', name: '平安银行' })
      ])
    );
  });

  it('falls back to Sina when Eastmoney returns empty', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('searchapi.eastmoney.com')) {
        return Promise.resolve({ data: { QuotationCodeTable: { Data: [] } } } as any);
      }
      if (url.includes('suggest3.sinajs.cn')) {
        return Promise.resolve({
          data: 'var suggestvalue="sh600000,浦发银行,;sz000001,平安银行,;";'
        } as any);
      }
      throw new Error('Unexpected url ' + url);
    });

    const res = await request(app).get('/symbols').query({ search: '银行' });
    expect(res.status).toBe(200);
    expect(res.body.symbols.length).toBeGreaterThan(0);
    expect(res.body.symbols[0]).toHaveProperty('symbol');
  });

  it('requires search param', async () => {
    const res = await request(app).get('/symbols');
    expect(res.status).toBe(400);
  });
});
