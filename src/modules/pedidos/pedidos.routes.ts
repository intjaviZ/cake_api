// src/modules/pedidos/pedidos.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { prisma } from '../../config/database';
import { PrismaPedidosRepository } from './pedidos.repository';
import { PrismaCatalogoRepository } from '../catalogo/catalogo.repository';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware';

const router = Router();
const pedidosRepo = new PrismaPedidosRepository(prisma);
const catalogoRepo = new PrismaCatalogoRepository(prisma);
const pedidosService = new PedidosService(pedidosRepo, catalogoRepo);
const controller = new PedidosController(pedidosService);

router.use(authenticateJWT);

router.post(
  '/',
  requireRole([Rol.CLIENTE], 'Solo un CLIENTE puede crear pedidos.'),
  controller.crear
);

router.get(
  '/',
  requireRole([Rol.CLIENTE, Rol.REPOSTERA], 'No autorizado.'),
  controller.listar
);

router.get(
  '/:id',
  requireRole([Rol.CLIENTE, Rol.REPOSTERA], 'No autorizado.'),
  controller.obtenerPorId
);

router.post(
  '/:id/pagar',
  requireRole([Rol.REPOSTERA], 'Solo la REPOSTERA puede registrar pagos.'),
  controller.pagar
);

router.post(
  '/:id/entregar',
  requireRole([Rol.REPOSTERA], 'Solo la REPOSTERA puede registrar entregas.'),
  controller.entregar
);

router.post(
  '/:id/cancelar',
  requireRole([Rol.CLIENTE, Rol.REPOSTERA], 'No autorizado.'),
  controller.cancelar
);

export default router;