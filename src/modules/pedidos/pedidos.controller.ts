// src/modules/pedidos/pedidos.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PedidosService } from './pedidos.service';

export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pedidosService.crearPedido(req.user!.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pedidosService.listarPedidos(req.user!, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pedidosService.obtenerPedidoPorId(req.params.id, req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  pagar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pedidosService.pagarPedido(req.params.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  entregar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pedidosService.entregarPedido(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  cancelar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pedidosService.cancelarPedido(req.params.id, req.user!, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}