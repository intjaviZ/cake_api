import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

interface JwtPayload {
  sub: string;
  rol: Rol;
  iat: number;
  exp: number;
}

export const authenticateJWT = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'TOKEN_REQUERIDO', 'Se requiere un token de autenticación.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: Number(decoded.sub),
      rol: decoded.rol,
    };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return next(
        new AppError(401, 'TOKEN_EXPIRADO', 'El token ha expirado. Inicia sesión de nuevo.')
      );
    }
    return next(new AppError(401, 'TOKEN_INVALIDO', 'El token proporcionado es inválido.'));
  }
};

export const requireRole = (rolesPermitidos: Rol[], mensajeError: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return next(new AppError(403, 'ROL_NO_AUTORIZADO', mensajeError));
    }
    next();
  };
};