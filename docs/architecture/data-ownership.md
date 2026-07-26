# Data Ownership Model

Status: Draft
Scope: Backend API — modelo de propiedad y acceso a recursos por usuario
Last updated: 2026-07-26

---

## Objetivo

Definir formalmente **qué recurso pertenece a quién** y **cómo se protege el acceso**,
para que la implementación de auth (épic DEV-5) no improvise estas reglas endpoint por
endpoint.

Este documento **diseña el modelo**. No implementa nada:

- La emisión de identidad (register / login / JWT / guard) es **DEV-83** (`BE — Auth`).
- La aplicación de estas reglas sobre los endpoints existentes es **DEV-64** (character
  detail) y las que sigan por recurso.

Orden de trabajo acordado: **DEV-109 (este doc) → DEV-83 (auth core) → DEV-64
(enforcement)**. Como el guard JWT existe antes del enforcement, el ownership se cablea
directo al usuario autenticado; no hay seam temporal ni `ownerId` de desarrollo.

## Contexto — lo que ya existe

- `Character` tiene `ownerId` (FK a `User`, `@@index([ownerId])`) — `prisma/schemas/Character.prisma`.
- `Campaign` tiene `ownerId` (relación `CampaignOwner`) y `players: Player[]` —
  `prisma/schemas/Campaign.prisma`.
- `Player` modela la membresía (`campaignId` + `userId` + `role` GM/PLAYER) —
  `prisma/schemas/Player.prisma`.
- `docs/api/rest-conventions.md` ya fija la convención de respuesta: **401** sin token,
  **403** autenticado sin permiso, **404** en vez de 403 para recursos privados de otro
  usuario (para no revelar existencia).
- `docs/architecture/frontend-backend-integration.md` §4 ya decidió **bearer JWT**.
- Hoy, sin enforcement: `characters.service.ts` toma `ownerId` del body en `create()` y
  **no filtra por owner** en `findOne`/`findAll`/`update`/`remove` — cualquiera ve/edita
  cualquier personaje. Eso es exactamente lo que DEV-64 cierra.

## Modelo de acceso — dos formas

La distinción que ordena todo el modelo:

| Forma             | Entidades                                       | Regla                                                                                                                         |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Dueño único**   | `Character`                                     | Un solo owner. Cualquier otro usuario → **404** (no se revela existencia).                                                    |
| **Multi-miembro** | `Campaign` y sus `Player` / `CampaignCharacter` | La **membresía** define visibilidad (no-miembro → 404); el **rol** define qué se puede mutar (miembro sin permiso → **403**). |

El `403` solo aparece en recursos multi-miembro: un usuario que **ve** el recurso pero cuya
**acción** no está permitida (p. ej. un PLAYER intentando editar la campaña). En recursos de
dueño único nunca se usa 403 — o sos el dueño, o para vos no existe (404).

## Regla transversal — el actor sale del token, nunca del body

El identificador del actor (`Character.ownerId`, `Campaign.ownerId`, `Player.userId`) se toma
**siempre del usuario autenticado** (claim `sub` del JWT, expuesto como `req.user` por el
guard de DEV-83). **Nunca** del body de la request.

- En `POST /characters`, `create()` deja de leer `input.ownerId`; el `ownerId` se setea desde
  el token. Un `ownerId` presente en el body se **ignora** (no es un override válido, ni
  siquiera para dev/admin).
- Lo mismo aplica a `Campaign.ownerId` en `POST /campaigns` y al `userId` del actor en las
  operaciones de `Player`.

## Reglas por entidad

### Character — dueño único

- Owner: `ownerId`.
- **Read / Update / Delete**: scoping por owner en el `WHERE`
  (`{ id, ownerId: <actor>, deletedAt: null }`). Si no es del actor, el query devuelve `null`
  → mismo **404** que "no existe". Esto satisface "no revelar existencia" sin un `if`
  imperativo posterior.
- **Create**: cualquier usuario autenticado; `ownerId` del token.
- Soft-delete: `deletedAt`.

### Campaign — multi-miembro

- Owner: `ownerId` (relación `CampaignOwner`, la GM/creadora).
- Miembros: el owner + filas de `Player` con `userId = <actor>`.
- **Read**: debe ser miembro →
  `{ id, archivedAt: null, OR: [{ ownerId: <actor> }, { players: { some: { userId: <actor> } } }] }`
  → `null` → **404**.
- **Create**: cualquier usuario autenticado; `ownerId` del token.
- **Update / archivar**: **solo el owner**. Miembro no-owner que intenta mutar → **403**;
  no-miembro → **404**.
- Soft-delete: **`archivedAt`** (no `deletedAt`, a diferencia de `Character`).

### Player — membresía (acceso derivado, sin owner propio)

No tiene owner; el acceso se deriva de la campaña + el `userId` de la propia fila.

- **List** (miembros de una campaña): cualquier miembro de esa campaña.
- **Create** (agregar / invitar miembro): **solo el owner** de la campaña.
- **Delete** (quitar miembro): el owner de la campaña (a cualquiera) **o** el propio usuario
  sobre su fila (abandonar la campaña).
- **Update** (rol / asignar personaje): el owner gestiona roles; un PLAYER puede setear o
  limpiar su propio `characterId` **solo si es dueño de ese `Character`**.
- Unicidad garantizada por schema: `@@unique([campaignId, userId])`.

### CampaignCharacter — join (acceso derivado de ambos lados)

No tiene owner; se resuelve caminando a la entidad dueña más cercana.

- **Read**: los miembros de la campaña ven el roster; además el dueño del `Character` ve los
  vínculos de su personaje.
- **Create** (adjuntar personaje a campaña): el actor debe **ser miembro de la campaña Y
  dueño del `Character`** que adjunta (cubre también a la GM sumando NPCs, que son personajes
  suyos).
- **Delete** (desadjuntar): el owner de la campaña **o** el dueño del `Character`.

## Matriz de códigos por operación

| Situación                          | Character              | Campaign / Player / CampaignCharacter |
| ---------------------------------- | ---------------------- | ------------------------------------- |
| Sin token en endpoint protegido    | 401                    | 401                                   |
| Recurso inexistente                | 404                    | 404                                   |
| Recurso de otro (no-miembro)       | **404**                | **404**                               |
| Miembro sin permiso para la acción | — (no aplica)          | **403**                               |
| ID con formato inválido            | 400 / error controlado | 400 / error controlado                |

## De dónde sale el actor — hoy vs post-DEV-83

- **Hoy (sin enforcement)**: el FE hardcodea `usr_demo` (`DEV_OWNER_ID` en
  `browchar-fe/src/components/characters/characterCreateForm.tsx`) y lo manda en el body; el
  service confía en él. Las lecturas no filtran por owner.
- **Post-DEV-83**: el guard JWT valida el token y expone `req.user`; el actor es
  `req.user.id`. El body ya no transporta ownership. DEV-64 aplica el scoping de `Character`
  contra ese actor real.

## Dónde se implementa (no en el controller)

La regla de ownership vive en la **capa de service, dentro del `WHERE` del query** (scoping),
no en un chequeo imperativo en el controller. Esto cumple el AC de DEV-64 ("la validación de
ownership no está hardcodeada en el controller") y hace que el 404-no-403 salga naturalmente
del filtro.

## Preguntas abiertas

- **`Campaign.userId`**: el schema tiene un campo `userId` nullable con relación `user`
  **aparte** de `owner` (`ownerId` / `CampaignOwner`). Su propósito no está claro y este
  modelo **no le asigna semántica de acceso**. Definir qué representa antes de que Campaign
  entre en implementación (post-MVP).

## Relación con tickets

- **DEV-109** (este doc): diseño.
- **DEV-83** (`BE — Auth`): emite identidad y expone `req.user`. Prerrequisito del enforcement.
- **DEV-64**: aplica el scoping de ownership sobre `Character` contra el actor autenticado.
- **DEV-29/30/31/32**: FE que consume la API de auth.
