import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '@/routes';
import { errorHandler, notFound } from '@/middleware/error';
import { httpLogger } from '@/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(httpLogger);

app.get('/', (_req, res) => {
  res.json({ message: 'OK' });
});

app.use(routes);

app.use(notFound);
app.use(errorHandler);

export default app;
