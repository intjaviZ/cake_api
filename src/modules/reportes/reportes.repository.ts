import { PrismaClient, EstadoPedido } from '@prisma/client';

export interface IReportesRepository {
  obtenerPedidosPagadosOEntregados(inicio: Date, fin: Date): Promise<any[]>;
  contarPedidosCancelados(inicio: Date, fin: Date): Promise<number>;
}

export class PrismaReportesRepository implements IReportesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPedidosPagadosOEntregados(inicio: Date, fin: Date) {
    return this.prisma.pedido.findMany({
      where: {
        estado: { in: [EstadoPedido.PAGADO, EstadoPedido.ENTREGADO] },
        fecha_pago: {
          gte: inicio,
          lte: fin,
        },
      },
      include: {
        items: {
          include: {
            pastel: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { fecha_pago: 'asc' },
    });
  }

  async contarPedidosCancelados(inicio: Date, fin: Date): Promise<number> {
    return this.prisma.pedido.count({
      where: {
        estado: EstadoPedido.CANCELADO,
        OR: [
          { fecha_cancelacion: { gte: inicio, lte: fin } },
          { fecha_creacion: { gte: inicio, lte: fin } },
        ],
      },
    });
  }
}