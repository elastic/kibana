<!-- Authoritative reference for the security-pr-test-impact skill. Changes here change what the matcher is
     documented to do; keep in sync with scripts/lib/matcher.mjs and scripts/lib/classify.mjs. -->

# Link rules

A **link** is a deterministic relationship between a changed production file and a test file. It says
the test sits in the right area. It says nothing about assertions. The matcher
(`scripts/lib/matcher.mjs`) is the only source of links; the model never adds or removes them.

## 1. File classification (`scripts/lib/classify.mjs`)

Every file in the PR diff is one of:

| Kind | Rule |
|---|---|
| **test / jest** | `*.test.ts`, `*.test.tsx`, `*.test.js`, `*.test.mjs` |
| **test / cypress** | `*.cy.ts` (anywhere, incl. `public/management/cypress/`) |
| **test / scout** | `*.spec.ts` or `tests/**/*.ts` under a `test/scout/` root |
| **test / ftr** | `.ts` under `x-pack/test/`, `x-pack/platform/test/`, `x-pack/solutions/<s>/test/`, `src/platform/test/`, excluding support dirs and `index.ts` loaders / `config*.ts` |
| **test / evals** | `kbn-evals-suite-*` packages and `evals/` directories (candidates for `import`, never feature-path) |
| **test / support** | Cypress tasks/screens/objects, FTR services/utils/fixtures/es_archives, Scout fixtures/configs, `__mocks__/`, `*.mock.ts`, `*.stories.tsx`, `test_utils*`, `test-api-clients/`, any other `test/`/`tests/` directory — scanned for nothing, never cited |
| **ignored** | `.md`/`.mdx`, images, lockfiles, `.snap`, `docs/`, `.github/`, `.buildkite/`, `.agents/`, `oas_docs/`, generated OpenAPI bundles (`docs/openapi/`, `*.bundled.schema.yaml`) and codegen (`*.gen.ts`), tooling/config files (`tsconfig*.json`, `package.json`, `kibana.jsonc`, `moon.yml`, `jest.config.js`, `.i18nrc.json`, …) |
| **production** | everything else (hand-written `*.schema.yaml` API contracts count as production) |

A PR with only test/ignored files yields zero production rows; the report lists the test files instead.

Only **production** files get a table row and a verdict. **Test** files in the PR take part
indirectly: when one of them is a link of a production row, that row becomes UPDATED and the test is
flagged `(in this PR: …)`. Test files that link to no row (typically mocks, fixtures, `index.ts`)
are listed in a collapsed Scope block. **Ignored** files are listed in a collapsed Scope block
("Files not analyzed") with a plain reason: generated code, documentation, image, config / tooling
file, lockfile, Jest snapshot, docs / CI / tooling path.

## 2. Search boundary (CODEOWNERS)

CODEOWNERS is parsed with GitHub semantics (last matching rule wins; `docs/*` matches direct children
only; a pattern without wildcards matches the path and everything under it).

Boundary = union of:

- literal path prefixes of every CODEOWNERS rule naming any team that owns a changed production file;
- the conventional Security test roots:
  - `x-pack/solutions/security/test/security_solution_cypress/`
  - `x-pack/solutions/security/plugins/security_solution/test/scout/`
  - `x-pack/solutions/security/test/security_solution_api_integration/`
  - `x-pack/solutions/security/test/api_integration/`, `.../api_integration_basic/`
- the directory of each changed production file.

Only test files inside the boundary are candidates. **Ownership itself is never a link**: a team
owning both the changed file and some tests produces no row entry unless rule 3 matches.

## 3. Link types

The names below (`import`, `colocated`, `feature-path`) are the technical ones used in the JSON
output and in this document. The markdown report shows them in plain language instead:
`imports it[, same name | , same folder]`, `same name, next to it`, `same folder only`, and
`similar path (…)` for feature-path groups (mapping table in `report-template.md`).

### `import` (strong)

A candidate test file (jest / ftr / scout / cypress, not support) contains an `import … from`,
`export … from`, `import()` or `require()` whose specifier resolves to the changed file:

- relative specifiers resolve against the test file's directory;
- `@kbn/<pkg>` and `@kbn/<pkg>/<sub>` resolve through `compilerOptions.paths` in `tsconfig.base.json`;
- extensions are ignored; `dir/index.ts` also matches imports of `dir`.

Test files added or modified **by the PR** take part too: their local content (if any) plus the
added lines of the PR patch (and the PR-head content for large added files) are scanned, so a new
test in the PR that imports the changed file is an `import` link with `in this PR: added`.

`jest.mock('./x')` is not an import link.

**Known limitation (one hop only):** a test that imports a route handler which in turn imports a
request schema does *not* link to the schema file. Such schema/type files can land in
NO EXISTING TEST even when the behavior is exercised through the route; the Checks section is where
that gap is called out. Do not hand-add transitive links.

### `colocated` (strong → medium)

A Jest test file in the **same directory** as the changed file.

- `same name`: `<name>.test.ts(x)` next to `<name>.ts(x)` — strongest.
- `same directory`: any other `*.test.ts(x)` in that directory — listed, capped at 6 in markdown
  (PR-touched first; the full list is in the JSON output).

### `feature-path` (weak)

For Cypress, Scout and FTR specs only. Those suites rarely import production code, so no import is
required. The matcher derives **feature tokens** from the production path and matches them against
directory segments of spec paths.

Tokens, most specific first: file basename (all extensions stripped, so `x.schema.yaml` → `x`),
then directory segments after `public/`, `server/`, `common/` or `src/` (innermost first), then the
plugin or package name (`plugins/<name>/`, `packages/kbn-<name>/`) — both as written and with Kibana
prefixes/suffixes stripped (`kbn-securitysolution-exceptions-common` → `exceptions`). Segments are
lower-cased, `-`→`_`, trailing `_ui|_api|_page|_pages|_tab|_tabs|_v2|_v3` stripped, then mapped
through `scripts/feature_path_aliases.json`:

- `aliases` — domain synonyms (e.g. `rules_management`→`rule_management`, `detections`→`detection_engine`,
  `lists`/`exception_lists`/`lists_and_exception_lists`→`exceptions`, `edr_workflows`→`management`
  because Defend Workflows UI lives under `public/management`).
- `stopSegments` — generic names that never count (`components`, `hooks`, `utils`, `routes`, `queries`,
  `tools`, `request`/`response`, `latest`, license-tier folder names, `security_solution`, …).
  Tokens shorter than 4 characters, `use_*` hooks and `__*` dirs are also dropped.

Known ambiguity: `management` (Defend Workflows) also appears as a directory name inside rule
management specs (`prebuilt_rules/management`). When it is the only matching token such specs show
up as a feature-path group; the printed anchor directory makes this visible and the link stays weak.

Each spec is scored by how many tokens appear in its directory path. Only the groups with the top
score (ties broken toward the most specific token) are kept; the **anchor directory** is the spec path
up to the deepest matched segment. The matcher keeps up to 6 specs per group as links (PR-touched specs always
kept); the report prints each group as a collapsible `similar path (<tokens> → <anchor dir>, N specs,
showing K)` block.

No `describe` / `it` / block-name matching, ever.

## 4. Verdicts (per production file)

| Verdict | Condition |
|---|---|
| `CANDIDATE COVERAGE — UPDATED` | ≥1 linked test, and this PR adds or modifies at least one of them |
| `CANDIDATE COVERAGE — NOT UPDATED` | ≥1 linked test, none touched by this PR |
| `NO EXISTING TEST` | no import, colocated, or feature-path link |

Tests the PR **removes** (or renames away) are excluded from links. Deleted production files still get
a row (marked `removed`).

## 5. Change type

What kind of change the file carries, so a reader can prioritise review. It is not a severity score.
Precedence: the copy-only check first; then `privilege` > `saved-object migration` > `route` >
`feature flag`; otherwise `UI` (`.tsx` or `public/`) or `API` (everything else). All matching tags
are shown; the reason is the first matching diff line or the path rule.

| Class | Signal (diff lines unless stated) |
|---|---|
| `copy` | file is `translations.ts(x)`, or every changed line is `defaultMessage`/`i18n.translate`/`FormattedMessage`/dotted i18n `id` |
| `privilege` | `requiredPrivileges`, `privilege(s)`, `authz`, `authc`, `capabilities`, `registerKibanaFeature`, `subFeature`, `security: {`, `RBAC` |
| `saved-object migration` | `modelVersions`, `savedObjects.registerType`, `SavedObjectsType`, `migrations:` |
| `route` | `router.<verb>`, `.versioned.<verb>`, `.addVersion(`, `path: '/api|/internal'`; or path under `routes/` or `*route.ts` |
| `feature flag` | `ExperimentalFeatures`, `useIsExperimentalFeatureEnabled`, `featureFlags.`, `FEATURE_FLAG`; or `experimental_features.ts` |
| `UI` / `API` | location default |

## 6. Existing-tests source

Default: the working tree (`git ls-files` + filesystem). With `--ref <git-ref>`: `git ls-tree` +
`git cat-file --batch` on that ref, and CODEOWNERS / `tsconfig.base.json` from the same ref. Use a
freshly fetched `main` when the checkout is stale; the report records the source under **Scope**.
