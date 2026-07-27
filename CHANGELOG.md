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

- **auth:** validate decoded JWT timestamps
- **seed:** skip demo credentials in production
- **auth:** equalize invalid credential timing
- **auth:** stop malformed stored hashes from 500-ing login
- **auth:** harden password policy and cut registration hashing cost
- **deps:** align contracts pin with the 0.4.0 bump
- **characters:** drop duplicated character_name/playbook_name fields
- **seed:** render empty Moves sections and fix invalid field types
- **config:** enable CORS for the frontend dev origin

### Future Considerations

- CI has no dependency/SCA gate. Triage or baseline the pre-existing audit debt before blocking regressions, otherwise inherited advisories will fail every unrelated PR.
- browchar-fe still pins contracts ^0.6.0, which cannot resolve 0.10.0 under 0.x semver. Bump it and consume the login contracts when frontend integration starts; the cross-repo check is warning-only.
- values is replaced wholesale, not merged field by field, so a caller must resend the full values object (including already-valid fields) or those required fields will fail validation as if missing. The FE integration (DEV-68) needs to always submit the full object, same as it does for create.
- CharacterListItem is defined by hand in both browchar-api and browchar-fe, so a change to the response shape on one side drifts silently from the other. Tracked in DEV-197 (move response types into @tpklabs/browchar-contracts as the single source of truth).
- **`@tpklabs/browchar-contracts` es privado en GitHub Packages:** los consumidores (`browchar-fe`) necesitan un `GITHUB_TOKEN` con `read:packages` para instalarlo (ver `docs/security/github-packages-token.md`).
- **`packages/contracts` queda fuera del lint del repo:** `npm run lint` y lint-staged apuntan a `src/**`, así que el TS del paquete no pasa por ESLint/Prettier en el pre-commit (sí lo cubren el `tsc --noEmit` global y sus tests Jest propios). Extender los globs de lint a `packages/**`, o darle al paquete su propio lint, cuando haya CI.
- **Borrado de campañas vs. `ON DELETE RESTRICT`:** cuando se implemente el módulo de campañas (hoy fuera del MVP), un `campaign.delete()` ingenuo lanzará violación de FK (Prisma `P2003`) si la mesa tiene filas en `CampaignCharacter` o `Player` — todas las FKs de campaña están en `ON DELETE RESTRICT`. Hay que elegir política antes: soft-archive (la columna `Campaign.archivedAt` ya existe — recomendado), cascade de los join rows dejando vivos a los `Character`, o devolver un 409 explícito. Un `Character` es independiente del owner, no de la mesa: no debe desaparecer al cerrarse una mesa.
- **Soft-delete de `Character` no limpia membresías de campaña:** `Character` usa `deletedAt`, pero `CampaignCharacter` no tiene soft-delete ni cascade. Cuando se implemente el borrado de personajes, un personaje soft-deleted conservará filas vivas en `CampaignCharacter` y un `Player.characterId` colgado (la regla `SET NULL` de la FK solo dispara en hard-delete). Los futuros listados de miembros deben filtrar `character.deletedAt: null`, o el soft-delete debe además desasociar las membresías.

### Known Issues

- ownership isn't enforced yet (still gated on DEV-64, not implemented), same gap that already exists on findOne. Anyone can PATCH any character until that lands.
