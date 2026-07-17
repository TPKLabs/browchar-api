# browchar-api

REST API for managing tabletop RPG character sheets. Built with NestJS, Prisma, and PostgreSQL.

## Stack

- **Runtime**: Node.js >=22.19 (ver `.nvmrc` / `engines`; el e2e con Testcontainers lo exige)
- **Framework**: NestJS 11
- **ORM**: Prisma 7 (adapter: `@prisma/adapter-pg`)
- **Database**: PostgreSQL
- **Language**: TypeScript (strict mode)
- **Test runner**: Jest

## Skills available

- `first-setup` — onboarding a new dev or setting up from scratch
- `pre-commit` — understanding or modifying the pre-commit checks
- `commit-conventions` — writing commit messages
- `changelog` — understanding or modifying the automatic CHANGELOG.md updater

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
packages/
  contracts/            # @tpklabs/browchar-contracts — shared FE/BE Zod schemas + types
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
- Types/validation shared with `browchar-fe` live in `@tpklabs/browchar-contracts` — see below.

## Shared contracts (`@tpklabs/browchar-contracts`)

`packages/contracts` is an npm workspace holding the **single source of truth**
for types and validation shared with `browchar-fe` (DEV-153). It exports the
domain field types (`FieldType`, `FieldDefinition`, `TemplateSection`), the
Characters request schemas (`createCharacterSchema`, `listCharactersQuerySchema`)
and `buildTemplateSchema(template)` — the Zod validator for a character's
`values` against its Playbook template.

**Every request and response type comes from this package** (DEV-197) — never
define local mirror interfaces. Naming convention (mandatory):
`<Entity><Operation>Response`, `<Entity><Operation>RequestBody`,
`<Entity><Operation>RequestParams`, with operations List / Get / Create /
Update / Delete (e.g. `CharacterUpdateRequestBody`, `CharacterListResponse`).
Response types declare the **wire shape** (dates as ISO strings); the API keeps
Prisma-derived types internally and `contracts.conformance.spec.ts` enforces
key parity between both at compile time.

- Import via the package name: `import { buildTemplateSchema } from '@tpklabs/browchar-contracts';`
- `src/common/types/{fields,template}.types.ts` re-export from it for backward
  compatibility — new code should import from `@tpklabs/browchar-contracts` directly.
- After editing the package, run `npm run contracts:build` so the API runtime
  picks it up (tests resolve it from source via jest `moduleNameMapper`).
- It publishes to GitHub Packages for the FE to consume — see
  `packages/contracts/README.md` for the publish/consume flow.

## Path aliases

Always use aliases over long relative paths.

| Alias                         | Resolves to                                   |
| ----------------------------- | --------------------------------------------- |
| `@db`                         | `./db.ts` (Prisma client singleton)           |
| `@/*`                         | `src/*`                                       |
| `@tpklabs/browchar-contracts` | `packages/contracts` (shared FE/BE contracts) |

```ts
import prisma from '@db';
import { buildTemplateSchema } from '@tpklabs/browchar-contracts';
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

| What       | Pattern                   | Example                     |
| ---------- | ------------------------- | --------------------------- |
| Controller | `<feature>.controller.ts` | `playbooks.controller.ts`   |
| Service    | `<feature>.service.ts`    | `playbooks.service.ts`      |
| Module     | `<feature>.module.ts`     | `playbooks.module.ts`       |
| Types      | `<name>.types.ts`         | `template.types.ts`         |
| Tests      | `<name>.spec.ts`          | `playbooks.service.spec.ts` |

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
npm run lint            # ESLint, check only (fails on any warning — same as CI)
npm run lint:fix        # ESLint with auto-fix
npm run test            # unit tests
npm run test:cov        # unit tests + coverage (aplica el umbral; igual que CI)
npm run test:e2e        # e2e tests
npx prisma generate     # regenerate Prisma client after schema changes
npx prisma migrate dev  # create and apply a new migration
npx tsx prisma/seed.ts  # seed the database
```

## E2E tests (DEV-149)

`npm run test:e2e` corre los specs `test/*.e2e-spec.ts` contra la API **real**,
como caja negra por HTTP. **Requiere Docker corriendo.** El script hace
`prisma generate` + `build` **una sola vez** y después `test:e2e:run` (el jest).
En CI el dist ya viene del step Build, así que el step e2e usa `test:e2e:run`
directo (sin recompilar).

El `globalSetup` (`test/e2e/global-setup.ts`) solo hace lo que depende del
contenedor: levanta un Postgres efímero con Testcontainers, corre
`migrate deploy` y arranca la app con **`npm run start:prod`** (el mismo comando
desplegable, para que su rotura rompa el e2e) como proceso aparte; el
`globalTeardown` para server y contenedor. Se corre la app compilada en node
—no `Test.createTestingModule` dentro de jest— a propósito: el cliente Prisma 7
(engine WASM) no inicializa bajo ts-jest. Los specs le pegan con `supertest` y
montan sus fixtures con `pg` directo (SQL), sin cargar Prisma en el proceso de
test. El primer run tarda (build + pull de la imagen postgres).

## Coverage gate (DEV-150)

`npm run test:cov` corre Jest con `--coverage` y aplica el `coverageThreshold`
de `package.json`. La corrida (y el CI) **falla** si la cobertura global baja de
**90% statements / 80% branches / 85% functions / 90% lines**.

Se mide sobre la lógica de negocio (services, schemas, controllers, utils),
cada una con su `.spec.ts`. `collectCoverageFrom` excluye solo lo que no tiene
lógica propia: `main.ts` (bootstrap), `*.module.ts` (wiring DI), `*.types.ts` y
`config/env.ts`. Los controllers **sí** se cuentan (tienen unit tests de
delegación) — no dependas del e2e para cubrirlos: hoy no corre en CI. Al agregar
un archivo con lógica, sumale su `.spec.ts` antes de tocar el umbral.

El paquete `packages/contracts` (fuente de verdad compartida) tiene su **propio**
gate: el jest raíz no lo cubre (`rootDir: src`), así que corre aparte con
`npm run test:cov -w @tpklabs/browchar-contracts` y su `jest.config.cjs` aplica
90/78/88/90 sobre los schemas (excluye el barrel `index.ts` y `pagination.ts`,
que es solo constantes + tipos). El CI lo corre en el step "Test contracts package".
