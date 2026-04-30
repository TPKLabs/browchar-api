/* import prisma from '@db';
import { systems } from './seeds/systems.seed';
import { gamesBySystem } from './seeds/games.seed';

async function main() {
  for (const sys of systems) {
    // Upsert Sistema
    const system = await prisma.system.upsert({
      where: { key: sys.key },
      update: { name: sys.name },
      create: { key: sys.key, name: sys.name },
    });

    const games = gamesBySystem[sys.key as keyof typeof gamesBySystem] || [];

    for (const g of games) {
      // Upsert Juego usando el ID del sistema recién creado/encontrado
      const game = await prisma.game.upsert({
        where: { key: g.key },
        update: { name: g.name, systemId: system.id },
        create: { key: g.key, name: g.name, systemId: system.id },
      });

      for (const t of g.playbooks) {
        // Upsert Playbook usando el ID del juego
        await prisma.playbook.upsert({
          where: {
            gameId_name_version: { gameId: game.id, name: t.name, version: t.version }
          },
          update: { schema: t.schema },
          create: {
            gameId: game.id,
            name: t.name,
            version: t.version,
            schema: t.schema
          },
        });
      }
    }
  }
  console.log('✅ Seeding modular completado con éxito.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); }); */