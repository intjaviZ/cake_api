import { IReportesRepository } from './reportes.repository';
import { AppError } from '../../shared/errors/AppError';

export class ReportesService {
  constructor(private readonly reportesRepo: IReportesRepository) {}

  private getISOWeekInfo(date: Date, minDateStr: string, maxDateStr: string) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7; // Lunes = 1 ... Domingo = 7
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dayNum + 1);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const thursday = new Date(d);
    thursday.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

    const periodo = `${thursday.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);

    return {
      periodo,
      desde: mondayStr < minDateStr ? minDateStr : mondayStr,
      hasta: sundayStr > maxDateStr ? maxDateStr : sundayStr,
    };
  }

  async generarReporteVentas(query: Record<string, any>) {
    const { fecha_inicio, fecha_fin } = query;
    const agrupar_por = query.agrupar_por ?? 'dia';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!fecha_inicio || typeof fecha_inicio !== 'string' || !dateRegex.test(fecha_inicio)) {
      throw new AppError(
        400,
        'PARAMETRO_INVALIDO',
        'fecha_inicio es obligatorio (formato YYYY-MM-DD).',
        [{ campo: 'fecha_inicio', valor_recibido: fecha_inicio ?? null }]
      );
    }

    if (!fecha_fin || typeof fecha_fin !== 'string' || !dateRegex.test(fecha_fin)) {
      throw new AppError(
        400,
        'PARAMETRO_INVALIDO',
        'fecha_fin es obligatorio (formato YYYY-MM-DD).',
        [{ campo: 'fecha_fin', valor_recibido: fecha_fin ?? null }]
      );
    }

    if (!['dia', 'semana', 'mes', 'pastel'].includes(agrupar_por)) {
      throw new AppError(
        400,
        'PARAMETRO_INVALIDO',
        "agrupar_por debe ser 'dia', 'semana', 'mes' o 'pastel'.",
        [{ campo: 'agrupar_por', valor_recibido: agrupar_por }]
      );
    }

    const inicioDate = new Date(`${fecha_inicio}T00:00:00.000Z`);
    const finDate = new Date(`${fecha_fin}T23:59:59.999Z`);

    if (isNaN(inicioDate.getTime()) || isNaN(finDate.getTime())) {
      throw new AppError(400, 'PARAMETRO_INVALIDO', 'Fechas inválidas.');
    }

    const diffDias = (finDate.getTime() - inicioDate.getTime()) / (1000 * 60 * 60 * 24);
    if (inicioDate > finDate || diffDias > 366) {
      throw new AppError(
        422,
        'RANGO_FECHAS_INVALIDO',
        'fecha_inicio no puede ser posterior a fecha_fin ni el rango mayor a 366 días.',
        [{ fecha_inicio, fecha_fin }]
      );
    }

    const [pedidos, pedidosCancelados] = await Promise.all([
      this.reportesRepo.obtenerPedidosPagadosOEntregados(inicioDate, finDate),
      this.reportesRepo.contarPedidosCancelados(inicioDate, finDate),
    ]);

    let totalVentas = 0;
    const totalPedidos = pedidos.length;
    let totalPorciones = 0;

    for (const p of pedidos) {
      totalVentas += Number(p.total_estimado);
      for (const it of p.items) {
        totalPorciones += it.porciones_totales;
      }
    }

    const ticketPromedio = totalPedidos > 0 ? Number((totalVentas / totalPedidos).toFixed(2)) : 0;

    const gruposMap = new Map<string, any>();

    if (agrupar_por === 'pastel') {
      for (const p of pedidos) {
        for (const it of p.items) {
          const key = String(it.pastel_catalogo_id);
          if (!gruposMap.has(key)) {
            gruposMap.set(key, {
              pastel_catalogo_id: it.pastel_catalogo_id,
              pastel_nombre: it.pastel.nombre,
              total_ventas: 0,
              pedidosSet: new Set<number>(),
              total_porciones: 0,
            });
          }
          const grp = gruposMap.get(key);
          grp.total_ventas += Number(it.precio_unitario) * it.porciones_totales;
          grp.pedidosSet.add(p.id);
          grp.total_porciones += it.porciones_totales;
        }
      }
    } else {
      for (const p of pedidos) {
        const fechaPago: Date = p.fecha_pago!;
        const fechaStr = fechaPago.toISOString().slice(0, 10);
        let key = '';
        let desde = '';
        let hasta = '';

        if (agrupar_por === 'dia') {
          key = fechaStr;
          desde = fechaStr;
          hasta = fechaStr;
        } else if (agrupar_por === 'semana') {
          const info = this.getISOWeekInfo(fechaPago, fecha_inicio, fecha_fin);
          key = info.periodo;
          desde = info.desde;
          hasta = info.hasta;
        } else if (agrupar_por === 'mes') {
          key = fechaStr.slice(0, 7); // YYYY-MM
          const [y, m] = key.split('-').map(Number);
          const firstDay = `${key}-01`;
          const lastDayDate = new Date(Date.UTC(y, m, 0));
          const lastDay = lastDayDate.toISOString().slice(0, 10);
          desde = firstDay < fecha_inicio ? fecha_inicio : firstDay;
          hasta = lastDay > fecha_fin ? fecha_fin : lastDay;
        }

        if (!gruposMap.has(key)) {
          gruposMap.set(key, {
            periodo: key,
            desde,
            hasta,
            total_ventas: 0,
            total_pedidos: 0,
            total_porciones: 0,
          });
        }

        const grp = gruposMap.get(key);
        grp.total_ventas += Number(p.total_estimado);
        grp.total_pedidos += 1;
        grp.total_porciones += p.items.reduce(
          (acc: number, it: any) => acc + it.porciones_totales,
          0
        );
      }
    }

    const grupos = Array.from(gruposMap.values()).map((g) => {
      if (agrupar_por === 'pastel') {
        return {
          pastel_catalogo_id: g.pastel_catalogo_id,
          pastel_nombre: g.pastel_nombre,
          total_ventas: Number(g.total_ventas.toFixed(2)),
          total_pedidos: g.pedidosSet.size,
          total_porciones: g.total_porciones,
        };
      }
      return {
        periodo: g.periodo,
        desde: g.desde,
        hasta: g.hasta,
        total_ventas: Number(g.total_ventas.toFixed(2)),
        total_pedidos: g.total_pedidos,
        total_porciones: g.total_porciones,
      };
    });

    return {
      rango: { fecha_inicio, fecha_fin },
      agrupar_por,
      resumen: {
        total_ventas: Number(totalVentas.toFixed(2)),
        total_pedidos: totalPedidos,
        total_porciones: totalPorciones,
        ticket_promedio: ticketPromedio,
        pedidos_cancelados: pedidosCancelados,
      },
      grupos,
    };
  }
}