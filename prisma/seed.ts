import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.pastelCatalogo.createMany({
    data: [
      { id: 1, nombre: '3 leches', permite_relleno: true, precio_base_porcion: 35.00, activo: true },
      { id: 2, nombre: 'Cheesecake', permite_relleno: false, precio_base_porcion: 45.00, activo: true },
      { id: 3, nombre: 'Chocolate', permite_relleno: true, precio_base_porcion: 40.00, activo: true },
      { id: 4, nombre: 'Zanahoria', permite_relleno: true, precio_base_porcion: 40.00, activo: true },
      { id: 5, nombre: 'Vainilla', permite_relleno: true, precio_base_porcion: 35.00, activo: true },
      { id: 6, nombre: 'Piña coco', permite_relleno: true, precio_base_porcion: 38.00, activo: true },
    ],
    skipDuplicates: true,
  });

  await prisma.relleno.createMany({
    data: [
      { id: 1, nombre: 'Oreo', activo: true },
      { id: 2, nombre: 'Fresa', activo: true },
      { id: 3, nombre: 'Durazno', activo: true },
      { id: 4, nombre: 'Cajeta con nuez', activo: true },
      { id: 5, nombre: 'Manjar', activo: true },
      { id: 6, nombre: 'Piña', activo: true },
    ],
    skipDuplicates: true,
  });

  const passwordHash = await bcrypt.hash('Repostera123', 10);
  await prisma.usuario.upsert({
    where: { email: 'repostera@pasteleria.com' },
    update: {},
    create: {
      nombre: 'Repostera Principal',
      telefono: '9610000000',
      email: 'repostera@pasteleria.com',
      password: passwordHash,
      rol: Rol.REPOSTERA,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });