# browchar-api

REST API for managing tabletop RPG character sheets. Built with NestJS, Prisma, and PostgreSQL.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 11
- **ORM**: Prisma 7 (adapter: `@prisma/adapter-pg`)
- **Database**: PostgreSQL
- **Language**: TypeScript (strict mode)
- **Test runner**: Jest

## Skills available

- `first-setup` — onboarding a new dev or setting up from scratch
- `pre-commit` — understanding or modifying the pre-commit checks
- `commit-conventions` — writing commit messages

## Architecture

Feature-first NestJS modules. Each feature lives in its own folder under `src/` and is self-contained.

```
HTTP Request
    ↓
XxxController        # routes, HTTP layer only
    ↓
XxxService           # business logic, data transformation
    ↓
prisma.model.query() # direct Prisma calls, no repository layer
    ↓
HTTP Response
```

No repository layer. Services call Prisma directly.

### Adding a new feature module

1. Create `src/<feature>/` with `<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`
2. Register it in `src/app.module.ts` imports

## Folder structure

```
src/
  app.module.ts         # root module
  main.ts               # bootstrap
  config/
    env.ts              # environment variables — read from here, never process.env directly
  common/
    types/              # shared TypeScript types and interfaces
  <feature>/
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
prisma/
  schema.prisma         # generator + datasource
  schemas/              # one .prisma file per entity
  migrations/
  generated/            # Prisma client output — never edit manually
  seed.ts
db.ts                   # Prisma client singleton
```

## TypeScript conventions

- `strict: true` is enabled. Honor it.
- `strictNullChecks` is on — handle `null` and `undefined` explicitly.
- `noImplicitAny` is off but avoid `any`. Prefer types inferred from Prisma generated output.
- Do not repeat types that Prisma already generates. Import from `./prisma/generated/client`.
- Shared types go in `src/common/types/*.types.ts`. Do not define ad-hoc types inside feature files.

## Path aliases

Always use aliases over long relative paths.

| Alias | Resolves to |
|---|---|
| `@db` | `./db.ts` (Prisma client singleton) |
| `@/*` | `src/*` |

```ts
import prisma from '@db';
import type { TemplateSection } from '@/common/types/template.types';
```

## Prisma conventions

- Schema is split across `prisma/schemas/*.prisma` — one file per entity.
- After any schema change run `npx prisma generate` to update the client.
- For new migrations: `npx prisma migrate dev --name <description>`.
- Never edit anything inside `prisma/generated/` — it is fully auto-generated.
- Seed data: `npx tsx prisma/seed.ts`.

## Environment variables

Never access `process.env` directly. Always go through `src/config/env.ts`:

```ts
import { env } from '@/config/env';
// env.PORT, env.DATABASE_URL, env.NODE_ENV
```

To add a new variable: add it to `env.ts`, add it to `.env.example`, document it in the first-setup Skill.

## Logging

`console.log` is blocked by ESLint (`no-console: error`). Use NestJS's built-in logger:

```ts
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(PlaybooksService.name);
this.logger.log('...');
this.logger.error('...');
```

## File naming conventions

| What | Pattern | Example |
|---|---|---|
| Controller | `<feature>.controller.ts` | `playbooks.controller.ts` |
| Service | `<feature>.service.ts` | `playbooks.service.ts` |
| Module | `<feature>.module.ts` | `playbooks.module.ts` |
| Types | `<name>.types.ts` | `template.types.ts` |
| Tests | `<name>.spec.ts` | `playbooks.service.spec.ts` |

Classes are PascalCase with the role as suffix: `PlaybooksController`, `PlaybooksService`, `PlaybooksModule`.

## What does not exist yet

Do not assume or introduce these patterns — they are not in the codebase:

- **DTOs** (`class-validator`, `class-transformer`) — request validation is not implemented
- **Global exception filters** — no centralized error handling
- **Repository layer** — services call Prisma directly
- **Authentication / guards** — no auth layer yet

## Useful commands

```bash
npm run start:dev       # dev server with watch
npm run lint            # ESLint with auto-fix
npm run test            # unit tests
npm run test:e2e        # e2e tests
npx prisma generate     # regenerate Prisma client after schema changes
npx prisma migrate dev  # create and apply a new migration
npx tsx prisma/seed.ts  # seed the database
```
