import { EstadoPedido, Rol } from '@prisma/client';
import { IPedidosRepository } from './pedidos.repository';
import { ICatalogoRepository } from '../catalogo/catalogo.repository';
import { CreatePedidoDTO, DistribucionInputDTO } from './pedidos.dto';
import { AppError } from '../../shared/errors/AppError';

export class PedidosService {
  constructor(
    private readonly pedidosRepo: IPedidosRepository,
    private readonly catalogoRepo: ICatalogoRepository
  ) {}

  private formatIsoUtc(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  async crearPedido(clienteId: number, dto: CreatePedidoDTO) {
    // 1. Validación estructural (400)
    if (!dto || typeof dto !== 'object') {
      throw new AppError(400, 'CUERPO_INVALIDO', 'El cuerpo de la solicitud es inválido.');
    }

    if (!dto.fecha_entrega_esperada || typeof dto.fecha_entrega_esperada !== 'string') {
      throw new AppError(400, 'CUERPO_INVALIDO', 'fecha_entrega_esperada es obligatoria.', [
        { campo: 'fecha_entrega_esperada', valor_recibido: dto.fecha_entrega_esperada ?? null },
      ]);
    }

    const fechaEntrega = new Date(dto.fecha_entrega_esperada);
    if (isNaN(fechaEntrega.getTime())) {
      throw new AppError(400, 'CUERPO_INVALIDO', 'fecha_entrega_esperada debe ser una fecha ISO 8601 válida.', [
        { campo: 'fecha_entrega_esperada', valor_recibido: dto.fecha_entrega_esperada },
      ]);
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new AppError(400, 'CUERPO_INVALIDO', 'El pedido debe incluir al menos un item.', [
        { campo: 'items', valor_recibido: dto.items ?? null },
      ]);
    }

    for (let i = 0; i < dto.items.length; i++) {
      const it = dto.items[i];
      if (
        typeof it.pastel_catalogo_id !== 'number' ||
        typeof it.porciones_totales !== 'number' ||
        typeof it.color_primario !== 'string' ||
        !it.color_primario.trim() ||
        typeof it.color_secundario !== 'string' ||
        !it.color_secundario.trim()
      ) {
        throw new AppError(
          400,
          'CUERPO_INVALIDO',
          `Estructura o tipos inválidos en items[${i}].`,
          [{ campo: `items[${i}]`, valor_recibido: it }]
        );
      }
    }

    // Validación método de pago si viene en el request (422)
    if (dto.metodo_pago !== undefined && dto.metodo_pago !== 'EFECTIVO_FISICO') {
      throw new AppError(
        422,
        'METODO_PAGO_NO_SOPORTADO',
        'El único método de pago soportado es EFECTIVO_FISICO.',
        [{ campo: 'metodo_pago', valor_recibido: dto.metodo_pago }]
      );
    }

    const ahora = new Date();
    const itemsProcesados = [];
    let totalEstimado = 0;

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];

      // 2. Pastel activo y existente
      const pastel = await this.catalogoRepo.findPastelById(item.pastel_catalogo_id);
      if (!pastel) {
        throw new AppError(422, 'PASTEL_NO_ENCONTRADO', `El pastel con id ${item.pastel_catalogo_id} no existe.`, [
          { campo: `items[${i}].pastel_catalogo_id`, valor_recibido: item.pastel_catalogo_id },
        ]);
      }
      if (!pastel.activo) {
        throw new AppError(422, 'PASTEL_INACTIVO', `El pastel '${pastel.nombre}' no se encuentra activo.`, [
          { campo: `items[${i}].pastel_catalogo_id`, valor_recibido: item.pastel_catalogo_id },
        ]);
      }

      // 3. Regla de relleno
      const tieneRelleno = item.relleno_id !== undefined && item.relleno_id !== null;
      if (!pastel.permite_relleno && tieneRelleno) {
        throw new AppError(
          422,
          'RELLENO_NO_PERMITIDO',
          `El pastel '${pastel.nombre}' no admite relleno.`,
          [{ campo: `items[${i}].relleno_id`, valor_recibido: item.relleno_id }]
        );
      }
      if (pastel.permite_relleno && !tieneRelleno) {
        throw new AppError(
          422,
          'RELLENO_REQUERIDO',
          `El pastel '${pastel.nombre}' requiere un relleno.`,
          [{ campo: `items[${i}].relleno_id`, valor_recibido: null }]
        );
      }

      if (tieneRelleno) {
        const relleno = await this.catalogoRepo.findRellenoById(item.relleno_id!);
        if (!relleno) {
          throw new AppError(422, 'RELLENO_NO_ENCONTRADO', `El relleno con id ${item.relleno_id} no existe.`, [
            { campo: `items[${i}].relleno_id`, valor_recibido: item.relleno_id },
          ]);
        }
        if (!relleno.activo) {
          throw new AppError(422, 'RELLENO_INACTIVO', `El relleno '${relleno.nombre}' está inactivo.`, [
            { campo: `items[${i}].relleno_id`, valor_recibido: item.relleno_id },
          ]);
        }
      }

      // 4. Regla de porciones (múltiplo de 10 entre 10 y 100)
      if (
        !Number.isInteger(item.porciones_totales) ||
        item.porciones_totales < 10 ||
        item.porciones_totales > 100 ||
        item.porciones_totales % 10 !== 0
      ) {
        throw new AppError(
          422,
          'PORCIONES_INVALIDAS',
          'porciones_totales debe ser múltiplo de 10 entre 10 y 100.',
          [{ campo: `items[${i}].porciones_totales`, valor_recibido: item.porciones_totales }]
        );
      }

      // 5. Regla de distribución
      let distribucionEfectiva: DistribucionInputDTO[] = [];

      if (item.porciones_totales < 50) {
        // Si es < 50, se ignora si fue enviada y se asigna 1 sola torta
        distribucionEfectiva = [{ porciones_torta: item.porciones_totales, cantidad: 1 }];
      } else {
        // >= 50: opcional; si se omite, default a 1 torta del total
        if (!item.distribucion || item.distribucion.length === 0) {
          distribucionEfectiva = [{ porciones_torta: item.porciones_totales, cantidad: 1 }];
        } else {
          let sumaPorciones = 0;
          for (let j = 0; j < item.distribucion.length; j++) {
            const dist = item.distribucion[j];
            if (
              !Number.isInteger(dist.porciones_torta) ||
              dist.porciones_torta <= 0 ||
              dist.porciones_torta % 10 !== 0
            ) {
              throw new AppError(
                422,
                'PORCIONES_TORTA_INVALIDAS',
                'Cada porciones_torta debe ser múltiplo de 10.',
                [{ campo: `items[${i}].distribucion[${j}].porciones_torta`, valor_recibido: dist.porciones_torta }]
              );
            }
            if (!Number.isInteger(dist.cantidad) || dist.cantidad < 1) {
              throw new AppError(
                422,
                'PORCIONES_TORTA_INVALIDAS',
                'La cantidad de tortas debe ser al menos 1.',
                [{ campo: `items[${i}].distribucion[${j}].cantidad`, valor_recibido: dist.cantidad }]
              );
            }
            sumaPorciones += dist.porciones_torta * dist.cantidad;
          }

          if (sumaPorciones !== item.porciones_totales) {
            throw new AppError(
              422,
              'DISTRIBUCION_INVALIDA',
              `La suma de (porciones_torta × cantidad) es ${sumaPorciones} y debe ser igual a porciones_totales (${item.porciones_totales}).`,
              [
                {
                  campo: `items[${i}].distribucion`,
                  suma_calculada: sumaPorciones,
                  porciones_totales: item.porciones_totales,
                },
              ]
            );
          }
          distribucionEfectiva = item.distribucion;
        }
      }

      const precioUnitario = Number(pastel.precio_base_porcion);
      totalEstimado += precioUnitario * item.porciones_totales;

      itemsProcesados.push({
        pastel_catalogo_id: item.pastel_catalogo_id,
        relleno_id: tieneRelleno ? item.relleno_id! : null,
        porciones_totales: item.porciones_totales,
        color_primario: item.color_primario,
        color_secundario: item.color_secundario,
        dedicatoria: item.dedicatoria ?? null,
        precio_unitario: precioUnitario,
        distribucion: distribucionEfectiva,
      });
    }

    // 6. Regla de fecha (al menos 48 horas posterior a creación)
    const minimoPermitidoMs = ahora.getTime() + 48 * 60 * 60 * 1000;
    const minimoPermitidoDate = new Date(minimoPermitidoMs);

    if (fechaEntrega.getTime() < minimoPermitidoMs) {
      throw new AppError(
        422,
        'FECHA_ENTREGA_INVALIDA',
        'La fecha de entrega debe ser al menos 48 horas posterior a la creación del pedido.',
        [
          {
            campo: 'fecha_entrega_esperada',
            valor_recibido: dto.fecha_entrega_esperada,
            minimo_permitido: this.formatIsoUtc(minimoPermitidoDate),
          },
        ]
      );
    }

    // 7. Regla de dedicatoria (máximo 50 caracteres)
    for (let i = 0; i < dto.items.length; i++) {
      const dedicatoria = dto.items[i].dedicatoria;
      if (dedicatoria && dedicatoria.length > 50) {
        throw new AppError(
          422,
          'DEDICATORIA_MUY_LARGA',
          'La dedicatoria no puede exceder 50 caracteres.',
          [
            {
              campo: `items[${i}].dedicatoria`,
              longitud: dedicatoria.length,
              maximo: 50,
            },
          ]
        );
      }
    }

    const pedidoCreado = await this.pedidosRepo.create({
      cliente_id: clienteId,
      fecha_creacion: ahora,
      fecha_entrega_esperada: fechaEntrega,
      notas_entrega: dto.notas_entrega ?? null,
      total_estimado: Number(totalEstimado.toFixed(2)),
      items: itemsProcesados,
    });

    return {
      id: pedidoCreado.id,
      cliente_id: pedidoCreado.cliente_id,
      fecha_creacion: this.formatIsoUtc(pedidoCreado.fecha_creacion),
      fecha_entrega_esperada: this.formatIsoUtc(pedidoCreado.fecha_entrega_esperada),
      estado: pedidoCreado.estado,
      total_estimado: Number(pedidoCreado.total_estimado),
      metodo_pago: pedidoCreado.metodo_pago,
      notas_entrega: pedidoCreado.notas_entrega,
      items: pedidoCreado.items.map((it: any) => ({
        id: it.id,
        pedido_id: it.pedido_id,
        pastel_catalogo_id: it.pastel_catalogo_id,
        relleno_id: it.relleno_id,
        porciones_totales: it.porciones_totales,
        color_primario: it.color_primario,
        color_secundario: it.color_secundario,
        dedicatoria: it.dedicatoria,
        precio_unitario: Number(it.precio_unitario),
        distribucion: it.distribucion.map((d: any) => ({
          id: d.id,
          item_pedido_id: d.item_pedido_id,
          porciones_torta: d.porciones_torta,
          cantidad: d.cantidad,
        })),
      })),
    };
  }

  async listarPedidos(user: { id: number; rol: Rol }, query: Record<string, any>) {
    const estadosValidos = Object.values(EstadoPedido);
    if (query.estado !== undefined && !estadosValidos.includes(query.estado)) {
      throw new AppError(
        400,
        'PARAMETRO_INVALIDO',
        `El valor '${query.estado}' no es un estado válido.`,
        [{ campo: 'estado', valor_recibido: query.estado }]
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (query.fecha_desde !== undefined) {
      if (!dateRegex.test(query.fecha_desde) || isNaN(Date.parse(query.fecha_desde))) {
        throw new AppError(400, 'PARAMETRO_INVALIDO', 'fecha_desde debe tener formato YYYY-MM-DD.', [
          { campo: 'fecha_desde', valor_recibido: query.fecha_desde },
        ]);
      }
    }

    if (query.fecha_hasta !== undefined) {
      if (!dateRegex.test(query.fecha_hasta) || isNaN(Date.parse(query.fecha_hasta))) {
        throw new AppError(400, 'PARAMETRO_INVALIDO', 'fecha_hasta debe tener formato YYYY-MM-DD.', [
          { campo: 'fecha_hasta', valor_recibido: query.fecha_hasta },
        ]);
      }
    }

    if (query.fecha_desde && query.fecha_hasta && query.fecha_desde > query.fecha_hasta) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'fecha_desde no puede ser mayor que fecha_hasta.', [
        { campo: 'fecha_desde', valor_recibido: query.fecha_desde },
      ]);
    }

    const campoFecha = query.campo_fecha ?? 'creacion';
    if (!['creacion', 'entrega'].includes(campoFecha)) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', "campo_fecha debe ser 'creacion' o 'entrega'.", [
        { campo: 'campo_fecha', valor_recibido: query.campo_fecha },
      ]);
    }

    const page = query.page !== undefined ? Number(query.page) : 1;
    const limit = query.limit !== undefined ? Number(query.limit) : 20;

    if (!Number.isInteger(page) || page < 1) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'El parámetro page debe ser un entero mayor o igual a 1.', [
        { campo: 'page', valor_recibido: query.page },
      ]);
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'El parámetro limit debe estar entre 1 y 100.', [
        { campo: 'limit', valor_recibido: query.limit },
      ]);
    }

    let clienteIdFiltro: number | undefined;
    if (user.rol === Rol.CLIENTE) {
      clienteIdFiltro = user.id; // Ignora cliente_id del query si es CLIENTE
    } else if (query.cliente_id !== undefined) {
      clienteIdFiltro = Number(query.cliente_id);
      if (!Number.isInteger(clienteIdFiltro) || clienteIdFiltro < 1) {
        throw new AppError(400, 'PARAMETRO_INVALIDO', 'cliente_id debe ser un número entero válido.', [
          { campo: 'cliente_id', valor_recibido: query.cliente_id },
        ]);
      }
    }

    const { pedidos, total } = await this.pedidosRepo.findManyPaginated({
      estado: query.estado,
      fecha_desde: query.fecha_desde,
      fecha_hasta: query.fecha_hasta,
      campo_fecha: campoFecha,
      cliente_id: clienteIdFiltro,
      page,
      limit,
    });

    return {
      data: pedidos.map((p) => ({
        id: p.id,
        cliente_id: p.cliente_id,
        fecha_creacion: this.formatIsoUtc(p.fecha_creacion),
        fecha_entrega_esperada: this.formatIsoUtc(p.fecha_entrega_esperada),
        estado: p.estado,
        total_estimado: Number(p.total_estimado),
        metodo_pago: p.metodo_pago,
        notas_entrega: p.notas_entrega,
        total_items: p._count.items,
      })),
      paginacion: {
        page,
        limit,
        total_registros: total,
        total_paginas: Math.ceil(total / limit) || 1,
      },
    };
  }

  async obtenerPedidoPorId(pedidoIdParam: string, user: { id: number; rol: Rol }) {
    const id = Number(pedidoIdParam);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'El id del pedido debe ser numérico.', [
        { campo: 'id', valor_recibido: pedidoIdParam },
      ]);
    }

    const pedido = await this.pedidosRepo.findByIdWithDetails(id);

    // Si no existe o pertenece a otro cliente, retorna 404 para no revelar existencia
    if (!pedido || (user.rol === Rol.CLIENTE && pedido.cliente_id !== user.id)) {
      throw new AppError(404, 'PEDIDO_NO_ENCONTRADO', `No se encontró el pedido ${id}.`, []);
    }

    return {
      id: pedido.id,
      cliente_id: pedido.cliente_id,
      cliente: {
        id: pedido.cliente.id,
        nombre: pedido.cliente.nombre,
        telefono: pedido.cliente.telefono,
      },
      fecha_creacion: this.formatIsoUtc(pedido.fecha_creacion),
      fecha_entrega_esperada: this.formatIsoUtc(pedido.fecha_entrega_esperada),
      estado: pedido.estado,
      total_estimado: Number(pedido.total_estimado),
      metodo_pago: pedido.metodo_pago,
      notas_entrega: pedido.notas_entrega,
      items: pedido.items.map((it: any) => ({
        id: it.id,
        pedido_id: it.pedido_id,
        pastel_catalogo_id: it.pastel_catalogo_id,
        pastel_nombre: it.pastel.nombre,
        relleno_id: it.relleno_id,
        relleno_nombre: it.relleno ? it.relleno.nombre : null,
        porciones_totales: it.porciones_totales,
        color_primario: it.color_primario,
        color_secundario: it.color_secundario,
        dedicatoria: it.dedicatoria,
        precio_unitario: Number(it.precio_unitario),
        distribucion: it.distribucion.map((d: any) => ({
          id: d.id,
          item_pedido_id: d.item_pedido_id,
          porciones_torta: d.porciones_torta,
          cantidad: d.cantidad,
        })),
      })),
    };
  }

  private obtenerEstadosPermitidos(estadoActual: EstadoPedido): EstadoPedido[] {
    switch (estadoActual) {
      case EstadoPedido.ORDENADO:
        return [EstadoPedido.PAGADO, EstadoPedido.CANCELADO];
      case EstadoPedido.PAGADO:
        return [EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO];
      default:
        return [];
    }
  }

  async pagarPedido(pedidoIdParam: string, body: { monto_recibido?: any }) {
    const id = Number(pedidoIdParam);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'El id del pedido debe ser numérico.', [
        { campo: 'id', valor_recibido: pedidoIdParam },
      ]);
    }

    const pedido = await this.pedidosRepo.findByIdWithDetails(id);
    if (!pedido) {
      throw new AppError(404, 'PEDIDO_NO_ENCONTRADO', `No se encontró el pedido ${id}.`, []);
    }

    if (pedido.estado !== EstadoPedido.ORDENADO) {
      throw new AppError(
        409,
        'TRANSICION_INVALIDA',
        `No se puede pasar de ${pedido.estado} a PAGADO.`,
        [
          {
            estado_actual: pedido.estado,
            estados_permitidos: this.obtenerEstadosPermitidos(pedido.estado),
          },
        ]
      );
    }

    const totalEstimado = Number(pedido.total_estimado);
    let montoRecibido = totalEstimado;

    if (body && body.monto_recibido !== undefined) {
      if (typeof body.monto_recibido !== 'number' || isNaN(body.monto_recibido)) {
        throw new AppError(400, 'CUERPO_INVALIDO', 'monto_recibido debe ser numérico.', [
          { campo: 'monto_recibido', valor_recibido: body.monto_recibido },
        ]);
      }
      if (body.monto_recibido < totalEstimado) {
        throw new AppError(
          422,
          'MONTO_INSUFICIENTE',
          `El monto recibido (${body.monto_recibido}) es menor al total estimado (${totalEstimado}).`,
          [{ campo: 'monto_recibido', valor_recibido: body.monto_recibido, total_estimado: totalEstimado }]
        );
      }
      montoRecibido = body.monto_recibido;
    }

    const fechaPago = new Date();
    const actualizado = await this.pedidosRepo.registrarPago(id, montoRecibido, fechaPago);

    return {
      id: actualizado.id,
      estado: actualizado.estado,
      metodo_pago: actualizado.metodo_pago,
      total_estimado: Number(actualizado.total_estimado),
      fecha_pago: this.formatIsoUtc(actualizado.fecha_pago!),
      monto_recibido: Number(actualizado.monto_recibido),
    };
  }

  async entregarPedido(pedidoIdParam: string) {
    const id = Number(pedidoIdParam);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'El id del pedido debe ser numérico.', [
        { campo: 'id', valor_recibido: pedidoIdParam },
      ]);
    }

    const pedido = await this.pedidosRepo.findByIdWithDetails(id);
    if (!pedido) {
      throw new AppError(404, 'PEDIDO_NO_ENCONTRADO', `No se encontró el pedido ${id}.`, []);
    }

    if (pedido.estado !== EstadoPedido.PAGADO) {
      const msgExtra =
        pedido.estado === EstadoPedido.ORDENADO ? ' El pedido debe estar PAGADO.' : '';
      throw new AppError(
        409,
        'TRANSICION_INVALIDA',
        `No se puede pasar de ${pedido.estado} a ENTREGADO.${msgExtra}`,
        [
          {
            estado_actual: pedido.estado,
            estados_permitidos: this.obtenerEstadosPermitidos(pedido.estado),
          },
        ]
      );
    }

    const fechaEntregaReal = new Date();
    const actualizado = await this.pedidosRepo.registrarEntrega(id, fechaEntregaReal);

    return {
      id: actualizado.id,
      estado: actualizado.estado,
      fecha_entrega_real: this.formatIsoUtc(actualizado.fecha_entrega_real!),
    };
  }

  async cancelarPedido(
    pedidoIdParam: string,
    user: { id: number; rol: Rol },
    body: { motivo?: any }
  ) {
    const id = Number(pedidoIdParam);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'El id del pedido debe ser numérico.', [
        { campo: 'id', valor_recibido: pedidoIdParam },
      ]);
    }

    const pedido = await this.pedidosRepo.findByIdWithDetails(id);
    if (!pedido || (user.rol === Rol.CLIENTE && pedido.cliente_id !== user.id)) {
      throw new AppError(404, 'PEDIDO_NO_ENCONTRADO', `No se encontró el pedido ${id}.`, []);
    }

    // Si ya está ENTREGADO o CANCELADO -> 409
    if (pedido.estado === EstadoPedido.ENTREGADO || pedido.estado === EstadoPedido.CANCELADO) {
      throw new AppError(
        409,
        'TRANSICION_INVALIDA',
        `No se puede pasar de ${pedido.estado} a CANCELADO.`,
        [
          {
            estado_actual: pedido.estado,
            estados_permitidos: [],
          },
        ]
      );
    }

    // Si un CLIENTE intenta cancelar un pedido PAGADO -> 403 CANCELACION_NO_PERMITIDA
    if (user.rol === Rol.CLIENTE && pedido.estado === EstadoPedido.PAGADO) {
      throw new AppError(
        403,
        'CANCELACION_NO_PERMITIDA',
        'Un pedido PAGADO solo puede ser cancelado por la repostera.',
        [{ estado_actual: EstadoPedido.PAGADO }]
      );
    }

    let motivo: string | null = null;
    if (body && body.motivo !== undefined && body.motivo !== null) {
      if (typeof body.motivo !== 'string') {
        throw new AppError(400, 'CUERPO_INVALIDO', 'El campo motivo debe ser texto.', [
          { campo: 'motivo', valor_recibido: body.motivo },
        ]);
      }
      if (body.motivo.length > 200) {
        throw new AppError(
          422,
          'MOTIVO_MUY_LARGO',
          'El motivo de cancelación no puede exceder 200 caracteres.',
          [{ campo: 'motivo', longitud: body.motivo.length, maximo: 200 }]
        );
      }
      motivo = body.motivo;
    }

    const fechaCancelacion = new Date();
    const actualizado = await this.pedidosRepo.registrarCancelacion(
      id,
      motivo,
      fechaCancelacion,
      user.rol
    );

    return {
      id: actualizado.id,
      estado: actualizado.estado,
      motivo_cancelacion: actualizado.motivo_cancelacion,
      fecha_cancelacion: this.formatIsoUtc(actualizado.fecha_cancelacion!),
      cancelado_por: actualizado.cancelado_por,
    };
  }
}