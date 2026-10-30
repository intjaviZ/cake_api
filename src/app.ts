import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import catalogoRoutes from './modules/catalogo/catalogo.routes';
import pedidosRoutes from './modules/pedidos/pedidos.routes';
import reportesRoutes from './modules/reportes/reportes.routes';
import { errorHandler } from './shared/middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

// Montaje bajo Base URL /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', catalogoRoutes);
app.use('/api/v1/pedidos', pedidosRoutes);
app.use('/api/v1/reportes', reportesRoutes);

// Middleware global de errores (siempre al final)
app.use(errorHandler);

export default app;