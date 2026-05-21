import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '@db';
import type { Prisma } from './generated/client';
import type { TemplateSection } from '../src/common/types/template.types';

import { apocalypseWorldPlaybookSpecificSections } from '../data/playbooks/apocalypse-world/playbookSections';

type SeedSystem = {
  key: string;
  name: string;
};

type SeedGame = {
  key: string;
  name: string;
  systemKey: string;
};

type SeedTemplateSection = TemplateSection & Prisma.JsonObject;

type BasePlaybook = {
  id: string;
  gameId: string;
  name: string;
  version: number;
  description?: string;
  template: SeedTemplateSection[];
};

type PlaybookSeedConfig = {
  folderName: string;
  specificSections: Record<string, SeedTemplateSection[]>;
};

const DATA_DIR = path.join(process.cwd(), 'data');

const PLAYBOOK_SEEDS_BY_GAME_KEY: Record<string, PlaybookSeedConfig> = {
  AW: {
    folderName: 'apocalypse-world',
    specificSections: apocalypseWorldPlaybookSpecificSections as Record<
      string,
      SeedTemplateSection[]
    >,
  },
};

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

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildPlaybookTemplate(
  baseTemplate: SeedTemplateSection[],
  specificSections: SeedTemplateSection[],
) {
  return cloneJson([...baseTemplate, ...specificSections]);
}

async function seedSystems() {
  const systemsPath = path.join(DATA_DIR, 'systems.json');
  const systems = await readJsonFile<SeedSystem[]>(systemsPath);
  validateSystemsSeed(systems, systemsPath);

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

  return systems.length;
}

async function seedGames() {
  const gamesPath = path.join(DATA_DIR, 'games', 'games.json');
  const games = await readJsonFile<SeedGame[]>(gamesPath);
  validateGamesSeed(games, gamesPath);
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

  return games.length;
}

async function seedPlaybooksForGame(
  gameKey: string,
  { folderName, specificSections }: PlaybookSeedConfig,
) {
  const game = await prisma.game.findUnique({
    where: {
      key: gameKey,
    },
  });

  if (!game) {
    throw new Error(`[SEED] Game with key "${gameKey}" not found`);
  }

  const playbooksDir = path.join(DATA_DIR, 'playbooks', folderName);
  const basePath = path.join(playbooksDir, 'base.json');
  const basePlaybook = await readJsonFile<BasePlaybook>(basePath);

  validateBasePlaybookSeed(basePlaybook, basePath);


  const playbookEntries = Object.entries(specificSections);

  if (playbookEntries.length === 0) {
    throw new Error(
      `[SEED] No playbook sections found for game "${gameKey}" in ${folderName}`,
    );
  }

  for (const [playbookName, specificSections] of playbookEntries) {
    const template = buildPlaybookTemplate(
      basePlaybook.template,
      specificSections,
    );

    await prisma.playbook.upsert({
      where: {
        gameId_name_version: {
          gameId: game.id,
          name: playbookName,
          version: basePlaybook.version,
        },
      },
      update: {
        description: `${playbookName} playbook for ${game.name}.`,
        template,
      },
      create: {
        gameId: game.id,
        name: playbookName,
        version: basePlaybook.version,
        description: `${playbookName} playbook for ${game.name}.`,
        template,
      },
    });
  }

  return playbookEntries.length;
}

async function seedPlaybooksForExistingGames() {
  const games = await prisma.game.findMany({
    orderBy: {
      key: 'asc',
    },
  });

  let playbooksCount = 0;

  for (const game of games) {
    const playbookSeedConfig = PLAYBOOK_SEEDS_BY_GAME_KEY[game.key];

    if (!playbookSeedConfig) {
      continue;
    }

    playbooksCount += await seedPlaybooksForGame(game.key, playbookSeedConfig);
  }

  return playbooksCount;
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string,
  source: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[SEED] Invalid field "${fieldName}" in ${source}`);
  }
}

function validateSystemsSeed(systems: SeedSystem[], source: string) {
  if (!Array.isArray(systems)) {
    throw new Error(`[SEED] Systems seed must be an array: ${source}`);
  }

  if (systems.length === 0) {
    throw new Error(`[SEED] Systems seed cannot be empty: ${source}`);
  }

  systems.forEach((system, index) => {
    assertNonEmptyString(system.key, `systems[${index}].key`, source);
    assertNonEmptyString(system.name, `systems[${index}].name`, source);
  });
}

function validateGamesSeed(games: SeedGame[], source: string) {
  if (!Array.isArray(games)) {
    throw new Error(`[SEED] Games seed must be an array: ${source}`);
  }

  if (games.length === 0) {
    throw new Error(`[SEED] Games seed cannot be empty: ${source}`);
  }

  games.forEach((game, index) => {
    assertNonEmptyString(game.key, `games[${index}].key`, source);
    assertNonEmptyString(game.name, `games[${index}].name`, source);
    assertNonEmptyString(game.systemKey, `games[${index}].systemKey`, source);
  });
}

function validateBasePlaybookSeed(
  basePlaybook: BasePlaybook,
  source: string,
) {
  if (!Number.isInteger(basePlaybook.version) || basePlaybook.version < 1) {
    throw new Error(`[SEED] Base playbook must have a valid version: ${source}`);
  }

  if (!Array.isArray(basePlaybook.template)) {
    throw new Error(`[SEED] Base playbook template must be an array: ${source}`);
  }

  if (basePlaybook.template.length === 0) {
    throw new Error(`[SEED] Base playbook template cannot be empty: ${source}`);
  }
}

async function main() {
  const systemsCount = await seedSystems();
  const gamesCount = await seedGames();
  const playbooksCount = await seedPlaybooksForExistingGames();

  console.log('\n✅ Seed finalizado correctamente.');
  console.log(`Systems creados/actualizados: ${systemsCount}`);
  console.log(`Games creados/actualizados: ${gamesCount}`);
  console.log(`Playbooks creados/actualizados: ${playbooksCount}`);
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
