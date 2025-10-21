import axios, { AxiosError } from 'axios';

export class ProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface RequestOptions {
  retries?: number;
  backoffMs?: number; // initial backoff
  timeoutMs?: number;
}

export async function requestWithRetry<T>(
  url: string,
  params: Record<string, string | number | undefined>,
  opts: RequestOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const timeout = opts.timeoutMs ?? 6000;
  const backoff = opts.backoffMs ?? 200;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get<T>(url, { params, timeout });
      return res.data;
    } catch (e) {
      lastErr = e;
      const axErr = e as AxiosError;
      const status = axErr.response?.status;
      const retriable = !status || (status >= 500 && status < 600);
      if (attempt === retries || !retriable) break;
      const delay = backoff * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new ProviderError(`Request failed for ${url}`, lastErr);
}
