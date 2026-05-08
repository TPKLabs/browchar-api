import fs from 'node:fs/promises';
import path from 'node:path';

import prisma from '@db';

type SeedSystem = {
  key: string;
  name: string;
};

type SeedGame = {
  key: string;
  name: string;
  systemKey: string;
};

type SeedPlaybook = {
  name: string;
  version: number;
  description?: string;
  template: unknown;
};

const DATA_DIR = path.join(process.cwd(), 'data');

async function readJsonFile<T>(filePath: string): Promise<T> {
  const file = await fs.readFile(filePath, 'utf-8');

  try {
    return JSON.parse(file) as T;
  } catch (error) {
    throw new Error(
      `[SEED] Invalid JSON file: ${filePath}\n${(error as Error).message}`,
    );
  }
}

async function seedSystems() {
  const systemsPath = path.join(DATA_DIR, 'systems.json');
  const systems = await readJsonFile<SeedSystem[]>(systemsPath);

  for (const system of systems) {
    await prisma.system.upsert({
      where: {
        key: system.key,
      },
      update: {
        name: system.name,
      },
      create: {
        key: system.key,
        name: system.name,
      },
    });
  }

  return systems;
}

async function seedGames() {
  const gamesPath = path.join(DATA_DIR, 'games', 'games.json');
  const games = await readJsonFile<SeedGame[]>(gamesPath);

  for (const game of games) {
    const system = await prisma.system.findUnique({
      where: {
        key: game.systemKey,
      },
    });

    if (!system) {
      throw new Error(
        `[SEED] System with key "${game.systemKey}" not found for game "${game.key}"`,
      );
    }

    await prisma.game.upsert({
      where: {
        key: game.key,
      },
      update: {
        name: game.name,
        systemId: system.id,
      },
      create: {
        key: game.key,
        name: game.name,
        systemId: system.id,
      },
    });
  }

  return games;
}

async function seedPlaybooksForGame(gameKey: string, folderName: string) {
  const game = await prisma.game.findUnique({
    where: {
      key: gameKey,
    },
  });

  if (!game) {
    throw new Error(`[SEED] Game with key "${gameKey}" not found`);
  }

  const playbooksDir = path.join(DATA_DIR, 'playbooks', folderName);
  const files = await fs.readdir(playbooksDir);

  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = path.join(playbooksDir, file);
    const playbook = await readJsonFile<SeedPlaybook>(filePath);

    if (!playbook.name || !playbook.version || !playbook.template) {
      console.warn(`[SEED] Skipping invalid playbook file: ${filePath}`);
      continue;
    }

    await prisma.playbook.upsert({
      where: {
        gameId_name_version: {
          gameId: game.id,
          name: playbook.name,
          version: playbook.version,
        },
      },
      update: {
        description: playbook.description,
        template: playbook.template,
      },
      create: {
        gameId: game.id,
        name: playbook.name,
        version: playbook.version,
        description: playbook.description,
        template: playbook.template,
      },
    });
  }
}

async function main() {
  await seedSystems();
  await seedGames();

  await seedPlaybooksForGame('AW', 'apocalypse-world');

  console.log('✅ Seeding completado con éxito.');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
