- This project is a WIP -

# Browchar — Backend

Backend para gestionar hojas de personaje multi-sistema (PBTA, D&D, Vampiro, etc.) con **Campaigns** (mesas/campañas), **Players** (membresías por campaña) y roster de **PCs/NPCs**.

---

## Requisitos

- Node.js >=22.19 (ver `.nvmrc`; lo exige el e2e con Testcontainers)
- Docker + Docker Compose
- Git

---

## Stack

- **NestJS + TypeScript**
- **PostgreSQL**
- **Prisma ORM**

---

## Cómo levantar la API

```bash
npm install                # instala deps (incluye workspaces, ej. packages/contracts)
cp .env.example .env       # completar variables si hace falta (DATABASE_URL, PORT, etc.)
docker compose up -d       # levanta Postgres
npx prisma migrate dev     # aplica migraciones y regenera el Prisma Client
npx prisma db seed         # opcional: carga playbooks/datos iniciales
npm run start:dev          # levanta la API con watch (corre contracts:build antes)
```

La API queda escuchando en `PORT` (por defecto `3000`, ver `.env.example`).

Otras variantes de arranque:

- `npm run start` — sin watch
- `npm run start:debug` — con debugger e inspector (`--inspect-brk`)
- `npm run build && npm run start:prod` — build de producción

---

### PRISMA

Formatear schema:
`npx prisma format`

Validar schema:
`npx prisma validate`

Generar Prisma Client:
`npx prisma generate`

Aplicar migraciones:
`npx prisma migrate dev`

Abrir Prisma Studio:
`npx prisma studio`

### DB

Chequeá si el contenedor está corriendo:
`docker ps`

`docker compose ps`

Correr la DB:
`docker compose up -d`

Detén y borra los volúmenes:
`docker compose down -v`

Seedear la base de datos:
`npx prisma db seed`
(esto sólo la va a popular con lo que está declarado en el archivo prisma\seed.ts)

---

## Modelo de datos (resumen)

#### User

- Cuenta global del sistema.
- Dueño de personajes (Characters)
- Puede crear y administrar Campaigns
- Participa en Campaigns como Player

#### System

- Familia de reglas / motor base el juego.
  Ejemplos: PBTA, DND5E, VTM5

#### Game

- Juego concreto dentro de un System.
  Ejemplos: Masks, Apocalypse World, D&D 5e, Vampiro 5e

#### Playbook

- Definición de hoja / playbook.
- Contiene el schema JSON que define campos y validaciones
- Versionado para evitar romper personajes existentes

#### Player

- Membresía de un User dentro de una Campaign, puede tener un Character asignado o no
- Define el rol (GM / Player)

#### Character

- Instancia de personaje basado en un Playbook.
- Pertenece a un User
- Puede reutilizarse en múltiples Campaigns

#### CampaignCharacter

- Asocia Characters a una Campaign.
- Permite NPCs (Characters sin Player)
- Guarda metadata contextual (ej. notas, flags)

#### Campaign

- Instancia de juego en curso (mesa/campaña).
- Pertenece a un Game
- Tiene un owner (User)
- Mantiene un roster de PCs y NPCs

---

## Flujos principales

- Crear Campaign: el owner se convierte automáticamente en GM

- Crear Character: se crea desde un Playbook y se valida contra su schema

- Agregar NPC: se asocia un Character a una Campaign como NPC

- Asignar Character: un Player asigna su personaje dentro de la Campaign

---

## Documentation

- [MVP](./docs/product/mvp.md)
- [REST conventions](./docs/api/rest-conventions.md)
- [Frontend/backend repo architecture](./docs/architecture/frontend-backend-integration.md)
