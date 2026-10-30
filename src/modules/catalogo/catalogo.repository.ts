import { PrismaClient, PastelCatalogo, Relleno } from '@prisma/client';

export interface ICatalogoRepository {
  findActivePasteles(): Promise<PastelCatalogo[]>;
  findActiveRellenos(): Promise<Relleno[]>;
  findPastelById(id: number): Promise<PastelCatalogo | null>;
  findRellenoById(id: number): Promise<Relleno | null>;
}

export class PrismaCatalogoRepository implements ICatalogoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActivePasteles(): Promise<PastelCatalogo[]> {
    return this.prisma.pastelCatalogo.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' },
    });
  }

  async findActiveRellenos(): Promise<Relleno[]> {
    return this.prisma.relleno.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' },
    });
  }

  async findPastelById(id: number): Promise<PastelCatalogo | null> {
    return this.prisma.pastelCatalogo.findUnique({ where: { id } });
  }

  async findRellenoById(id: number): Promise<Relleno | null> {
    return this.prisma.relleno.findUnique({ where: { id } });
  }
}