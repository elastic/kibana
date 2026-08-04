# add_data_grid

Shared-shaped components for the Add Data experience. This directory mirrors
the `src/` of a future platform-shared package (working name
`x-pack/platform/packages/shared/kbn-add-data-grid`) so the lift is a
directory move plus wiring. Design context:
https://github.com/elastic/ingest-dev/issues/8726

## Rules

- Import only: `react`, `@elastic/eui`, `@emotion/react`, `@kbn/i18n`,
  `@kbn/i18n-react`, and sibling files. No `useKibana`, no routers, no plugin
  imports (not even types). Hosts pass everything through props: rendered
  icon nodes, final hrefs/onClick handlers, translated content strings,
  pre-filtered result items, a card renderer.
- Import from this directory through `index.ts` (the future package entry).
- Every component has a colocated test that renders WITHOUT
  `KibanaContextProvider` or a router. If you need a provider, the component
  no longer belongs here.
- Both rules above are enforced by `../add_data_grid_boundary.test.ts`, which
  fails on any import outside the allowlist, any relative import that leaves
  this directory, and any host deep-import that bypasses `index.ts`. Widening
  the allowlist there is a deliberate decision about what the future package
  may depend on, not a formality.
- i18n ids for component chrome live under
  `xpack.observability_onboarding.addDataGrid.*`. Content strings belong to
  the host (see `../add_data_page/observability_flavor.tsx`).

## Lift checklist (when a second consumer is real)

1. `git mv` this directory into the new package's `src/`, add `kibana.jsonc`
   (owner: `@elastic/streams-ui`, group `platform`, visibility `shared`),
   `package.json`, `tsconfig.json`, and point the package `index.ts` at it.
2. Rename the i18n prefix from
   `xpack.observability_onboarding.addDataGrid` to the package's own prefix
   and add the path mapping to `x-pack/.i18nrc.json`.
3. Replace host imports (`../add_data_grid`) with the package id.
4. Move `../add_data_grid_boundary.test.ts` in with it and repoint `GRID_ROOT`
   and `PUBLIC_ROOT`, so the new package keeps guarding its own boundary.
5. Run `node scripts/i18n_check --fix` and the moved jest tests.
