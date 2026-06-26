---
name: first-setup
description: Step-by-step guide to set up the project from scratch for the first time. Use when the user asks how to set up the project, run it for the first time, clone and run, or onboard a new dev.
---

# First Setup

Follow these steps in order. Each step must succeed before moving to the next.

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL running locally (default: `localhost:5432`)

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Create the `.env` file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then open `.env` and set:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
```

The default values in `.env.example` assume a local PostgreSQL instance with:
- user: `nest_user`
- password: `nest_password`
- database: `rpg_sheets_db`

Create that database and user in PostgreSQL if they don't exist yet.

---

## 3. Run database migrations

```bash
npx prisma migrate deploy
```

This applies all existing migrations in `prisma/migrations/` to the database.

---

## 4. Generate Prisma client

```bash
npx prisma generate
```

This generates the TypeScript client in `prisma/generated/`.

---

## 5. Seed the database

```bash
npx tsx prisma/seed.ts
```

Populates the database with initial data: systems, games, and playbooks.

---

## 6. Start the dev server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000` (or the `PORT` set in `.env`).

---

## Verify everything works

Run the test suite to confirm the setup is correct:

```bash
npm test
```

---

## Pre-commit hooks

After `npm install`, husky sets up Git hooks automatically. On every commit:

1. **lint-staged** runs ESLint (`--fix`) and Prettier (`--write`) on staged `.ts` files — **this modifies your files in place** before the commit goes through. Review the diff after a failed commit if files changed unexpectedly.
2. TypeScript type-check (`tsc --noEmit`)
3. Prisma schema validation
4. Unit tests

> In CI environments (`CI=true`), husky is skipped automatically — hooks only run locally.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `DATABASE_URL` connection error | Check PostgreSQL is running and credentials in `.env` match |
| `prisma generate` fails | Make sure `npm install` ran successfully first |
| Seed fails with "System not found" | Run migrations before seeding (`prisma migrate deploy` first) |
| Port already in use | Change `PORT` in `.env` or kill the process on that port |
