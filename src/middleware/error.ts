import type { NextFunction, Request, Response } from 'express';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  // if an error has a JSON-safe payload, use it; otherwise just send message
  const payload = err.payload && typeof err.payload === 'object' ? err.payload : undefined;
  res.status(status).json({ error: message, ...(payload ? { details: payload } : {}) });
}
