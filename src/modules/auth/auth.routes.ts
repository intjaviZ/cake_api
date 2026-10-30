// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { prisma } from '../../config/database';
import { PrismaAuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

const router = Router();
const authRepository = new PrismaAuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;