import { PrismaClient, EstadoPedido, Rol, Prisma } from '@prisma/client';
import { CreatePedidoPersistenceInput, ListPedidosQueryDTO } from './pedidos.dto';

export interface IPedidosRepository {
  create(data: CreatePedidoPersistenceInput): Promise<any>;
  findByIdWithDetails(id: number): Promise<any | null>;
  findManyPaginated(filters: ListPedidosQueryDTO): Promise<{ pedidos: any[]; total: number }>;
  registrarPago(id: number, montoRecibido: number, fechaPago: Date): Promise<any>;
  registrarEntrega(id: number, fechaEntregaReal: Date): Promise<any>;
  registrarCancelacion(
    id: number,
    motivo: string | null,
    fechaCancelacion: Date,
    canceladoPor: Rol
  ): Promise<any>;
}

export class PrismaPedidosRepository implements IPedidosRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreatePedidoPersistenceInput) {
    return this.prisma.pedido.create({
      data: {
        cliente_id: data.cliente_id,
        fecha_creacion: data.fecha_creacion,
        fecha_entrega_esperada: data.fecha_entrega_esperada,
        estado: EstadoPedido.ORDENADO,
        total_estimado: data.total_estimado,
        metodo_pago: 'EFECTIVO_FISICO',
        notas_entrega: data.notas_entrega,
        items: {
          create: data.items.map((item) => ({
            pastel_catalogo_id: item.pastel_catalogo_id,
            relleno_id: item.relleno_id,
            porciones_totales: item.porciones_totales,
            color_primario: item.color_primario,
            color_secundario: item.color_secundario,
            dedicatoria: item.dedicatoria,
            precio_unitario: item.precio_unitario,
            distribucion: {
              create: item.distribucion.map((d) => ({
                porciones_torta: d.porciones_torta,
                cantidad: d.cantidad,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            distribucion: true,
          },
        },
      },
    });
  }

  async findByIdWithDetails(id: number) {
    return this.prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, nombre: true, telefono: true },
        },
        items: {
          include: {
            pastel: { select: { nombre: true } },
            relleno: { select: { nombre: true } },
            distribucion: true,
          },
        },
      },
    });
  }

  async findManyPaginated(filters: ListPedidosQueryDTO) {
    const where: Prisma.PedidoWhereInput = {};

    if (filters.cliente_id !== undefined) {
      where.cliente_id = filters.cliente_id;
    }

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.fecha_desde || filters.fecha_hasta) {
      const campo = filters.campo_fecha === 'entrega' ? 'fecha_entrega_esperada' : 'fecha_creacion';
      where[campo] = {};
      if (filters.fecha_desde) {
        (where[campo] as Prisma.DateTimeFilter).gte = new Date(`${filters.fecha_desde}T00:00:00.000Z`);
      }
      if (filters.fecha_hasta) {
        (where[campo] as Prisma.DateTimeFilter).lte = new Date(`${filters.fecha_hasta}T23:59:59.999Z`);
      }
    }

    const skip = (filters.page - 1) * filters.limit;

    const [pedidos, total] = await Promise.all([
      this.prisma.pedido.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return { pedidos, total };
  }

  async registrarPago(id: number, montoRecibido: number, fechaPago: Date) {
    return this.prisma.pedido.update({
      where: { id },
      data: {
        estado: EstadoPedido.PAGADO,
        monto_recibido: montoRecibido,
        fecha_pago: fechaPago,
      },
    });
  }

  async registrarEntrega(id: number, fechaEntregaReal: Date) {
    return this.prisma.pedido.update({
      where: { id },
      data: {
        estado: EstadoPedido.ENTREGADO,
        fecha_entrega_real: fechaEntregaReal,
      },
    });
  }

  async registrarCancelacion(
    id: number,
    motivo: string | null,
    fechaCancelacion: Date,
    canceladoPor: Rol
  ) {
    return this.prisma.pedido.update({
      where: { id },
      data: {
        estado: EstadoPedido.CANCELADO,
        motivo_cancelacion: motivo,
        fecha_cancelacion: fechaCancelacion,
        cancelado_por: canceladoPor,
      },
    });
  }
}