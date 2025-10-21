import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '@/routes';
import { errorHandler, notFound } from '@/middleware/error';
import { httpLogger } from '@/logger';
import { ALLOWED_ORIGINS } from '@/config';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
    credentials: true
  })
);
app.use(express.json());
app.use(httpLogger);

app.get('/', (_req, res) => {
  res.json({ message: 'OK' });
});

app.use(routes);

app.use(notFound);
app.use(errorHandler);

export default app;
