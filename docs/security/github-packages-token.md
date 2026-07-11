# GitHub Packages token — security considerations

Status: Active
Scope: Auth for publishing/consuming `@tpklabs/browchar-contracts` (DEV-153)
Last updated: 2026-07-11

How to _set up_ the token is covered in the `first-setup` skill and
`packages/contracts/README.md`. This doc covers the **security posture**: what
the current setup protects, what it doesn't, and what must change when CI
lands.

---

## Current posture (what's already in place)

- **No secret is ever committed.** The repo-root `.npmrc` contains only the
  env-var reference `${GITHUB_TOKEN}`; the value lives in each dev's
  environment. Verified: no token-shaped strings in the working tree or in the
  full git history.
- **The published tarball cannot leak secrets.** `packages/contracts/package.json`
  whitelists `"files": ["dist"]`, and the `.npmrc` lives at the repo root (not
  inside the package dir), so it can never be packed.
- **npm does not persist the token.** No `~/.npmrc` is created; npm resolves
  the env-ref at read time.

## Token requirements (personal PATs, until CI exists)

GitHub Packages' npm registry only accepts **classic** PATs, which cannot be
restricted to a single org or repo — so minimizing scope and lifetime is the
only lever available:

1. **Minimal scope.** `write:packages` to publish, `read:packages` to consume.
   Nothing else — in particular **not `repo`**: repos are public, and `repo`
   grants read/write over every repository the account can touch, massively
   widening the blast radius of a leak.
2. **Set an expiration** (90 days or less). A never-expiring classic PAT stays
   valid until someone remembers to revoke it.
3. **Environment only.** `setx GITHUB_TOKEN ...` (Windows) or shell profile
   `export` (macOS/Linux). Never in any file inside a repo, never pasted into
   chats/issues/logs. Note the trade-off: user-level env vars are plaintext,
   readable by any process running as your user — standard dev practice, but
   it's why scope + expiry matter.
4. **One token per human,** never shared. Sharing breaks revocation (you can't
   cut off one person) and auditing (the audit log can't tell users apart).

## If a token leaks

1. Revoke it immediately: GitHub → Settings → Developer settings →
   Personal access tokens → Delete.
2. Generate a replacement (minimal scope + expiry, per above) and update your
   environment.
3. Check the org audit log (`https://github.com/organizations/TPKLabs/settings/audit-log`)
   for package publishes or API activity you don't recognize.
4. If the leaked token had `repo` or broader scopes, review recent commits/
   releases on all repos the account can write to.

## Pending for CI (checklist)

When GitHub Actions is set up, personal PATs should disappear from the publish
path entirely:

- [ ] **Publish workflow** in `browchar-api` using the built-in
      `secrets.GITHUB_TOKEN` with least-privilege job permissions
      (`permissions: { contents: read, packages: write }`). The built-in token
      is repo-scoped, auto-issued and auto-expired per run — strictly better
      than any PAT.
- [ ] **Trigger discipline:** publish only from protected refs (tag `v*` or
      release), never from arbitrary branches or `pull_request` events —
      PR-triggered workflows on a public repo run third-party code.
- [ ] **Grant `browchar-fe` repo access to the package** (package settings →
      Manage Actions access) so the FE's CI can install with _its own_ built-in
      `GITHUB_TOKEN` instead of a PAT secret.
- [ ] **Rotate/revoke all personal `write:packages` PATs** once the workflow
      publishes — humans should keep at most `read:packages` for local FE
      installs.
- [ ] **Extend lint/typecheck to the `packages/` tree in CI** (already logged
      as a Future Consideration in `CHANGELOG.md`) so the published code passes
      the same gates as `src/`.
- [ ] Optional hardening: `npm publish --provenance` (needs OIDC + public
      package) if the package is ever made public.
