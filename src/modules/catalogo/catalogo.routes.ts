// src/modules/catalogo/catalogo.routes.ts
import { Router } from 'express';
import { prisma } from '../../config/database';
import { PrismaCatalogoRepository } from './catalogo.repository';
import { CatalogoService } from './catalogo.service';
import { CatalogoController } from './catalogo.controller';

const router = Router();
const repo = new PrismaCatalogoRepository(prisma);
const service = new CatalogoService(repo);
const controller = new CatalogoController(service);

router.get('/pasteles', controller.getPasteles);
router.get('/rellenos', controller.getRellenos);
router.get('/configuracion-tamanos', controller.getConfiguracionTamanos);

export default router;