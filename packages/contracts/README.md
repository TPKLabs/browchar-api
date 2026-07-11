# @tpklabs/browchar-contracts

Fuente de verdad única de **tipos y validación** compartidos entre
[`browchar-api`](https://github.com/TPKLabs/browchar-api) y
[`browchar-fe`](https://github.com/TPKLabs/browchar-fe) (DEV-153).

Ambos stacks ya hablan Zod (`nestjs-zod` en el back, `zod` + `react-hook-form`
en el front), así que este paquete exporta los schemas Zod una sola vez y los
dos repos los consumen, en vez de mantener copias a mano que driftean.

## Qué exporta

- `FieldType`, `FieldDefinition`, `FieldOption`, `TemplateSection`, `Template` —
  vocabulario de dominio del `template` de un Playbook.
- `createCharacterSchema`, `listCharactersQuerySchema` (+ sus tipos inferidos) —
  schemas de request del recurso Characters.
- `buildTemplateSchema(template, { coerceNumbers? })` — construye el schema Zod
  de los `values` de un personaje a partir del `template` de su Playbook.
  Reemplaza el validador imperativo del back y el builder del form del front.
- `ValidationError` — forma de un error de validación por campo.

## Consumo

### Dentro de browchar-api (workspace local)

`browchar-api` declara `packages/*` como npm workspace, así que consume este
paquete por symlink sin publicar nada:

```ts
import { buildTemplateSchema } from '@tpklabs/browchar-contracts';
```

Tras editar el paquete, reconstruí el `dist` para que el runtime del API lo vea:

```bash
npm run contracts:build   # desde la raíz de browchar-api
```

Los tests del API resuelven el paquete contra `src` (ver `moduleNameMapper` en
`package.json`), así que no necesitan `dist`.

### Desde browchar-fe (paquete publicado)

Se publica a **GitHub Packages** bajo el scope `@tpklabs`. Requisitos:

1. Los repos viven bajo la organización de GitHub `TPKLabs`.
2. Un `.npmrc` (ya versionado en ambos repos) mapea el scope al registry:
   ```
   @tpklabs:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```
3. `GITHUB_TOKEN` en el entorno con permiso `read:packages` (consumir) o
   `write:packages` (publicar). **Nunca** hardcodear el token en el `.npmrc`.

   Atajo si ya usás la GitHub CLI (reusa su sesión, sin crear un PAT aparte):

   ```bash
   gh auth refresh -s read:packages      # write:packages para publicar
   export GITHUB_TOKEN=$(gh auth token)  # agregalo a tu profile
   ```

> Nota: `browchar-api` **no** necesita token — resuelve este paquete como
> workspace local. El token sólo hace falta para **publicar** o para consumirlo
> desde `browchar-fe`.

Publicar (manual hasta que haya CI):

```bash
cd packages/contracts
npm version patch      # 0.1.0 -> 0.1.1
npm publish            # corre `prepublishOnly` (build) y sube al registry
```

> A futuro, con CI (GitHub Actions), el publish debería usar el
> `secrets.GITHUB_TOKEN` integrado (ya trae permiso de packages) — sin PATs
> personales que crear ni rotar.

Consumir en el front:

```jsonc
// browchar-fe/package.json
"dependencies": { "@tpklabs/browchar-contracts": "^0.1.0" }
```
