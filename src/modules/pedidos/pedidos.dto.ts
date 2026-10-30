import { EstadoPedido, Rol } from '@prisma/client';

export interface DistribucionInputDTO {
  porciones_torta: number;
  cantidad: number;
}

export interface ItemPedidoInputDTO {
  pastel_catalogo_id: number;
  relleno_id?: number | null;
  porciones_totales: number;
  color_primario: string;
  color_secundario: string;
  dedicatoria?: string;
  distribucion?: DistribucionInputDTO[];
}

export interface CreatePedidoDTO {
  fecha_entrega_esperada: string;
  notas_entrega?: string;
  metodo_pago?: string;
  items: ItemPedidoInputDTO[];
}

export interface ListPedidosQueryDTO {
  estado?: EstadoPedido;
  fecha_desde?: string;
  fecha_hasta?: string;
  campo_fecha?: 'creacion' | 'entrega';
  cliente_id?: number;
  page: number;
  limit: number;
}

export interface CreatePedidoPersistenceInput {
  cliente_id: number;
  fecha_creacion: Date;
  fecha_entrega_esperada: Date;
  notas_entrega: string | null;
  total_estimado: number;
  items: {
    pastel_catalogo_id: number;
    relleno_id: number | null;
    porciones_totales: number;
    color_primario: string;
    color_secundario: string;
    dedicatoria: string | null;
    precio_unitario: number;
    distribucion: DistribucionInputDTO[];
  }[];
}