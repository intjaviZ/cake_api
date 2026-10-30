import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        codigo: 'CUERPO_INVALIDO',
        mensaje: 'El cuerpo de la petición no es un JSON válido.',
        detalles: [],
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        codigo: err.codigo,
        mensaje: err.message,
        detalles: err.detalles,
      },
    });
    return;
  }

  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'Ocurrió un error interno en el servidor.',
      detalles: [],
    },
  });
};