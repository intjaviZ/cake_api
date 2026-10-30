import { PrismaClient, Usuario, Rol } from '@prisma/client';

export interface IAuthRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  createCliente(data: { nombre: string; telefono: string; email: string; passwordHash: string }): Promise<Usuario>;
}

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async createCliente(data: {
    nombre: string;
    telefono: string;
    email: string;
    passwordHash: string;
  }): Promise<Usuario> {
    return this.prisma.usuario.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        password: data.passwordHash,
        rol: Rol.CLIENTE, // Fuerza siempre CLIENTE
      },
    });
  }
}