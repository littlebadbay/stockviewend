import pino from 'pino';
import pinoHttp from 'pino-http';
import { NODE_ENV } from '@/config';

export const logger = pino({
  level: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug')
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true
});
