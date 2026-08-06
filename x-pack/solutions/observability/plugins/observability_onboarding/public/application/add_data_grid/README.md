# add_data_grid

Host-agnostic components for the Add Data experience: search bar, curated grid,
mini tiles row, search results. This directory mirrors the `src/` of a future
platform-shared package (working name
`x-pack/platform/packages/shared/kbn-add-data-grid`), so nothing in here may
reach for Kibana context, a router, or another plugin. Design context:
https://github.com/elastic/ingest-dev/issues/8726

## What is reusable, and what is not

Reusable today: the components here plus the view-model types in `types.ts`.
Hosts pass everything in through props, including rendered icon nodes, resolved
`href` and `onClick` handlers, translated content strings, pre-filtered result
items, and a card renderer. `icon`, `browseAllTile` and `renderCard` are
deliberate render slots, so a host can change what a tile or a result card
looks like without forking a component.

Host-specific: which tiles exist, where they navigate, where result items come
from, and the page chrome around all of it. For Observability that wiring lives
in `../add_data_page/`.

Not shared yet: the assembled end-to-end experience. Packaging the whole
pipeline (Fleet hook loading, curation, retry, card rendering) as one component
is only worth doing once a second host wants that same experience, and no such
host exists. Until then this directory stays a set of primitives.

## Rules

- Production files import only `react`, `@elastic/eui`, `@emotion/react`,
  `@kbn/i18n`, `@kbn/i18n-react` and siblings. Tests add the testing libraries.
  Hosts reach this directory through `index.ts` only, because a package exposes
  one entry point and no subpaths.
- Every component has a colocated test that renders without
  `KibanaContextProvider` and without a router. A component that needs a
  provider does not belong here.
- `../add_data_grid_boundary.test.ts` enforces all of the above. Widening its
  allowlist is a decision about what the future package may depend on, not a
  formality.
- i18n ids for component chrome live under
  `xpack.observability_onboarding.addDataGrid.*`. Content strings belong to the
  host (see `../add_data_page/observability_flavor.tsx`).

## Lift checklist (for when a consumer outside Observability is real)

1. `git mv` this directory into the new package's `src/`, add `kibana.jsonc`
   (owner `@elastic/streams-ui`, group `platform`, visibility `shared`),
   `package.json`, `tsconfig.json` and `jest.config.js`, then point the package
   `index.ts` at this entry.
2. Rename the i18n prefix to the package's own and add the path mapping to
   `x-pack/.i18nrc.json`.
3. Replace host imports of `../add_data_grid` with the package id.
4. Move `../add_data_grid_boundary.test.ts` in with it and repoint `GRID_ROOT`
   and `PUBLIC_ROOT`, so the package keeps guarding its own boundary.
5. Run `node scripts/i18n_check --fix` and the moved jest tests.
