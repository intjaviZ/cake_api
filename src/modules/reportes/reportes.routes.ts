// src/modules/reportes/reportes.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { prisma } from '../../config/database';
import { PrismaReportesRepository } from './reportes.repository';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware';

const router = Router();
const repo = new PrismaReportesRepository(prisma);
const service = new ReportesService(repo);
const controller = new ReportesController(service);

router.get(
  '/ventas',
  authenticateJWT,
  requireRole([Rol.REPOSTERA], 'Solo la REPOSTERA puede consultar reportes.'),
  controller.ventas
);

export default router;