// src/modules/catalogo/catalogo.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CatalogoService } from './catalogo.service';

export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  getPasteles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.catalogoService.obtenerPasteles());
    } catch (error) {
      next(error);
    }
  };

  getRellenos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.catalogoService.obtenerRellenos());
    } catch (error) {
      next(error);
    }
  };

  getConfiguracionTamanos = (_req: Request, res: Response): void => {
    res.status(200).json(this.catalogoService.obtenerConfiguracionTamanos());
  };
}