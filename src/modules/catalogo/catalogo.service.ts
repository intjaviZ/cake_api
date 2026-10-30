import { ICatalogoRepository } from './catalogo.repository';

export class CatalogoService {
  constructor(private readonly catalogoRepo: ICatalogoRepository) {}

  async obtenerPasteles() {
    const pasteles = await this.catalogoRepo.findActivePasteles();
    return {
      data: pasteles.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        permite_relleno: p.permite_relleno,
        precio_base_porcion: Number(p.precio_base_porcion),
        activo: p.activo,
      })),
    };
  }

  async obtenerRellenos() {
    const rellenos = await this.catalogoRepo.findActiveRellenos();
    return {
      data: rellenos.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        activo: r.activo,
      })),
    };
  }

  obtenerConfiguracionTamanos() {
    return {
      porciones_minimas: 10,
      porciones_maximas: 100,
      multiplo: 10,
      opciones_porciones: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      umbral_distribucion: 50,
      dedicatoria_max_caracteres: 50,
      margen_minimo_entrega_horas: 48,
      metodos_pago: ['EFECTIVO_FISICO'],
    };
  }
}