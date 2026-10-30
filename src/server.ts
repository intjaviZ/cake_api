import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${env.PORT}/api/v1`);
});