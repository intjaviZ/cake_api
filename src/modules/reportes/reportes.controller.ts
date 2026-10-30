// src/modules/reportes/reportes.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ReportesService } from './reportes.service';

export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  ventas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.reportesService.generarReporteVentas(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}