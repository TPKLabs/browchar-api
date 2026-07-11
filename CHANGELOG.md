# Changelog

This file does **not** log every change. It only tracks, per [Unreleased] release:

- **Fixed** — bugs that were actually resolved (`fix:` commits).
- **Known Issues** — bugs found but intentionally left unresolved, to be fixed later.
- **Future Considerations** — risks, conflicts, or follow-ups implied by a change made now.

Entries are added automatically by `npm run commit` — see
[`.claude/skills/changelog/changelog.md`](.claude/skills/changelog/changelog.md) for how to flag
a known issue or a future consideration in a commit message.

## [Unreleased]

### Fixed

- **config:** enable CORS for the frontend dev origin

### Future Considerations

- **Borrado de campañas vs. `ON DELETE RESTRICT`:** cuando se implemente el módulo de campañas (hoy fuera del MVP), un `campaign.delete()` ingenuo lanzará violación de FK (Prisma `P2003`) si la mesa tiene filas en `CampaignCharacter` o `Player` — todas las FKs de campaña están en `ON DELETE RESTRICT`. Hay que elegir política antes: soft-archive (la columna `Campaign.archivedAt` ya existe — recomendado), cascade de los join rows dejando vivos a los `Character`, o devolver un 409 explícito. Un `Character` es independiente del owner, no de la mesa: no debe desaparecer al cerrarse una mesa.
- **Soft-delete de `Character` no limpia membresías de campaña:** `Character` usa `deletedAt`, pero `CampaignCharacter` no tiene soft-delete ni cascade. Cuando se implemente el borrado de personajes, un personaje soft-deleted conservará filas vivas en `CampaignCharacter` y un `Player.characterId` colgado (la regla `SET NULL` de la FK solo dispara en hard-delete). Los futuros listados de miembros deben filtrar `character.deletedAt: null`, o el soft-delete debe además desasociar las membresías.
