import fs from 'node:fs/promises';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import prisma from '@db';
import { buildTemplateSchema } from '@tpklabs/browchar-contracts';
import type { Prisma } from './generated/client';
import type { TemplateSection } from '../src/common/types/template.types';
import { env } from '../src/config/env';

import { apocalypseWorldPlaybookSpecificSections } from '../data/playbooks/apocalypse-world/playbookSections';
import { dungeonWorldPlaybookSpecificSections } from '../data/playbooks/dungeon-world/playbookSections';

const logger = new Logger('Seed');

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
  DW: {
    folderName: 'dungeon-world',
    specificSections: dungeonWorldPlaybookSpecificSections as Record<
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

function validateBasePlaybookSeed(basePlaybook: BasePlaybook, source: string) {
  if (!Number.isInteger(basePlaybook.version) || basePlaybook.version < 1) {
    throw new Error(
      `[SEED] Base playbook must have a valid version: ${source}`,
    );
  }

  if (!Array.isArray(basePlaybook.template)) {
    throw new Error(
      `[SEED] Base playbook template must be an array: ${source}`,
    );
  }

  if (basePlaybook.template.length === 0) {
    throw new Error(`[SEED] Base playbook template cannot be empty: ${source}`);
  }
}

async function seedUsers() {
  // Usuario demo SOLO para desarrollo (sin auth todavía, DEV-5).
  // Permite probar POST /characters usando ownerId: "usr_demo".
  const demo = await prisma.user.upsert({
    where: { email: 'demo@browchar.dev' },
    update: {},
    create: {
      id: 'usr_demo',
      email: 'demo@browchar.dev',
      passwordHash: 'dev-only-not-a-real-hash',
    },
  });

  return demo;
}

type SeedCharacter = {
  /** Id fijo para que el seed sea idempotente (upsert por id). */
  id: string;
  name: string;
  gameKey: string;
  playbookName: string;
  values: Prisma.InputJsonObject;
};

/**
 * Characters de ejemplo SOLO para test/desarrollo (no se shippean: se omiten
 * cuando NODE_ENV=production). Cubren varios playbooks de AW y DW para ejercitar
 * los flujos de /characters y la validación de `values` contra el template.
 */
const CHARACTER_SEEDS: SeedCharacter[] = [
  {
    id: 'chr_seed_aw_angel',
    name: 'Doc',
    gameKey: 'AW',
    playbookName: 'Angel',
    values: {
      look: "Man's body, kind eyes, utility wear",
      pronouns: 'he/him',
      experience: 2,
      cool: 1,
      hard: -1,
      hot: 1,
      sharp: 2,
      weird: 0,
      harm: 0,
      gear: 'Angel kit, silenced 9mm',
      weapons: '9mm (2-harm close loud)',
      hx: 'Keeler +2, Marlon +1',
      notes: 'Owes the hardholder a favor.',
      stock: '6',
    },
  },
  {
    id: 'chr_seed_aw_chopper',
    name: 'Rust',
    gameKey: 'AW',
    playbookName: 'Chopper',
    values: {
      look: 'Man, cold eyes, worn leathers',
      pronouns: 'he/him',
      experience: 0,
      cool: 0,
      hard: 2,
      hot: 1,
      sharp: 1,
      weird: -1,
      harm: 1,
      gear: 'Chain, machete',
      gang_size: 15,
      gang_harm: '2-harm',
      gang_armor: '1-armor',
      gang_tags: 'medium, unruly, savage',
      bike_strength: 'fast, aggressive',
      bike_looks: 'sleek, black',
      bike_weaknesses: 'unreliable',
    },
  },
  {
    id: 'chr_seed_aw_battlebabe',
    name: 'Vale',
    gameKey: 'AW',
    playbookName: 'Battlebabe',
    values: {
      look: 'Woman, sharp eyes, worn leathers',
      pronouns: 'she/her',
      experience: 3,
      cool: 2,
      hard: 1,
      hot: 0,
      sharp: 1,
      weird: -1,
      harm: 0,
      conditions: 'shattered',
      weapons: 'Antique laser pistol (3-harm far)',
      battlebabe_custom_weapons: 'Ornate sword (2-harm hand)',
    },
  },
  {
    id: 'chr_seed_dw_fighter',
    name: 'Bruenor',
    gameKey: 'DW',
    playbookName: 'Fighter',
    values: {
      look: 'Battered plate, braided beard, hard eyes',
      level: 1,
      xp: 0,
      strength: 16,
      dexterity: 9,
      constitution: 15,
      intelligence: 8,
      wisdom: 13,
      charisma: 12,
      hp: 25,
      armor: 3,
      coins: 5,
      bonds: 'Elaria owes me for saving her life.',
      gear: 'Scale armor, shield, warhammer',
      race: 'dwarf',
      alignment: 'good',
      gear_choice: ['scale_armor', 'shield'],
    },
  },
  {
    id: 'chr_seed_dw_wizard',
    name: 'Elaria',
    gameKey: 'DW',
    playbookName: 'Wizard',
    values: {
      look: 'Robes, curious eyes, wild hair',
      level: 1,
      xp: 2,
      strength: 8,
      dexterity: 12,
      constitution: 13,
      intelligence: 16,
      wisdom: 15,
      charisma: 9,
      hp: 17,
      armor: 0,
      coins: 3,
      bonds: 'Bruenor is a decent sort, if a bit dim.',
      gear: 'Spell book, dagger',
      race: 'elf',
      alignment: 'neutral',
      gear_choice: ['dagger', 'bag_of_books'],
    },
  },
  {
    id: 'chr_seed_dw_thief',
    name: 'Pip',
    gameKey: 'DW',
    playbookName: 'Thief',
    values: {
      look: 'Cloaked, shifty eyes, quick hands',
      level: 1,
      xp: 1,
      strength: 9,
      dexterity: 16,
      constitution: 12,
      intelligence: 13,
      wisdom: 15,
      charisma: 8,
      hp: 18,
      armor: 1,
      coins: 20,
      bonds: 'I lifted something from Vale once. She never noticed.',
      gear: "Leather armor, daggers, thieves' tools",
      race: 'halfling',
      alignment: 'chaotic',
      gear_choice: ['leather_armor', 'dagger', 'throwing_daggers'],
    },
  },
];

async function seedCharacters(ownerId: string) {
  if (env.NODE_ENV === 'production') {
    logger.log('NODE_ENV=production: se omite el seed de characters (test-only).');
    return 0;
  }

  let count = 0;

  for (const seed of CHARACTER_SEEDS) {
    const game = await prisma.game.findUnique({ where: { key: seed.gameKey } });

    if (!game) {
      throw new Error(
        `[SEED] Game "${seed.gameKey}" not found for character "${seed.name}"`,
      );
    }

    const playbook = await prisma.playbook.findFirst({
      where: { gameId: game.id, name: seed.playbookName },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, template: true },
    });

    if (!playbook) {
      throw new Error(
        `[SEED] Playbook "${seed.playbookName}" (game ${seed.gameKey}) not found for character "${seed.name}"`,
      );
    }

    // Auto-chequeo: los `values` hechos a mano deben validar contra el template
    // del playbook (misma validación que aplica POST /characters).
    const parsed = buildTemplateSchema(playbook.template).safeParse(seed.values);

    if (!parsed.success) {
      throw new Error(
        `[SEED] Character "${seed.name}" has invalid values for playbook "${seed.playbookName}":\n` +
          JSON.stringify(parsed.error.issues, null, 2),
      );
    }

    await prisma.character.upsert({
      where: { id: seed.id },
      update: {
        name: seed.name,
        ownerId,
        playbookId: playbook.id,
        playbookVersion: playbook.version,
        values: seed.values,
      },
      create: {
        id: seed.id,
        name: seed.name,
        ownerId,
        playbookId: playbook.id,
        playbookVersion: playbook.version,
        values: seed.values,
      },
    });

    count++;
  }

  return count;
}

async function main() {
  const demoUser = await seedUsers();
  const systemsCount = await seedSystems();
  const gamesCount = await seedGames();
  const playbooksCount = await seedPlaybooksForExistingGames();
  const charactersCount = await seedCharacters(demoUser.id);

  logger.log('Seed finalizado correctamente.');
  logger.log(`Systems creados/actualizados: ${systemsCount}`);
  logger.log(`Games creados/actualizados: ${gamesCount}`);
  logger.log(`Playbooks creados/actualizados: ${playbooksCount}`);
  logger.log(`Characters (test) creados/actualizados: ${charactersCount}`);
  logger.log(`Usuario demo (dev): ${demoUser.id}`);
}

main()
  .catch((error) => {
    logger.error('Error ejecutando seed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
