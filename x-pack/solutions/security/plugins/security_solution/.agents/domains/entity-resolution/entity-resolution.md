# Domain: Entity Resolution

## What every reviewer must know

Entity Resolution consolidates duplicate entity records (the same person or host appearing across multiple identity providers) into **resolution groups**: one primary "golden" *target* entity plus one or more *alias* entities. The relationship is asymmetric — only alias entities carry `entity.relationships.resolution.resolved_to` pointing at the golden target; **the golden entity never sets `resolved_to` on itself** (mining-report.md:355, code-architecture.md:124-128). This non-self-linking asymmetry is the root cause of the frontend grouping complexity (the "missing primary entity" problem). The grouping data model is **flat, not transitive** — an alias may never itself be the target of another group. The domain has two write paths: a **CSV bulk-link flow** (client-side papaparse validation → `multipart/form-data` POST → server `processResolutionCsvUpload` orchestrator) and an **interactive UI flow** (`ResolutionGroupTab` plus `useLinkEntities` / `useUnlinkEntities` over the public `RESOLUTION_LINK` / `RESOLUTION_UNLINK` routes). Both write the same `resolved_to` field via the separate `@kbn/entity-store` plugin's `ResolutionClient`. The CSV upload endpoint is a BFF layer in `security_solution`'s `entity_analytics` lib; the core link/unlink/group primitives live in the `entity_store` plugin owned by another team (code-architecture.md:117-126, slack-signal.md:34-40).

## Architectural invariants

- **An alias entity can never be a resolution target for another group; transitive/chained resolution is not supported** — The data model and grouping query are flat. The CSV orchestrator rejects a target whose own `resolved_to` is already set (`csv_upload.ts:147-155`), and `useSearchEntities` excludes already-resolved entities from the add-candidate list (`hooks/use_search_entities.ts:29-38`). Violating this breaks grouping semantics and produces an inconsistent graph. (slack-signal.md:26-32, high confidence)

- **Resolution is not self-linking — only alias entities carry `resolved_to`** — The primary (golden) entity must never set `entity.relationships.resolution.resolved_to` on itself; only aliases point to the golden entity. (mining-report.md:355, code-architecture.md:124-128)

- **CSV upload entity-matching loops must cap matches at 1,000 per row** — `findMatchingEntities` paginates with `searchAfter` and stops at 1000 (`csv_upload.ts:194-200`); it must not accumulate matched IDs unbounded. Unbounded matching risks memory exhaustion on broad queries at enterprise scale. Resolution groups are expected to be small (well under 1k), so this cap also encodes a domain assumption — any feature that could produce arbitrarily large groups must revisit it. Asset-criticality CSV uses 10k as its precedent; resolution deliberately uses 1k. (PR [#260006](https://github.com/elastic/kibana/pull/260006) @hop-dev, fixed in [#260475](https://github.com/elastic/kibana/pull/260475); mining-report.md:165-171, 356)

- **The CSV upload route must validate the enterprise license before doing any work** — `entityResolutionCsvUploadRoute` checks the license up front, before obtaining clients or processing the file (`routes/upload_csv.ts:60`). When adding a license check to any resolution feature, every test that exercises it must mock the license as active or assert the disabled state — a mock/gate mismatch is a real failure mode. (code-architecture.md:133; PR [#260548](https://github.com/elastic/kibana/pull/260548) @macroscopeapp)

## Common review patterns (learned from real PRs)

- **CSV-upload / BFF endpoints go in `entity_analytics`, not `entity_store`** — Do not assume all resolution HTTP endpoints belong in the `entity_store` plugin. File-upload / BFF endpoints (CSV upload, `processResolutionCsvUpload` orchestration) live in the `entity_analytics` lib alongside other upload endpoints (e.g. asset criticality); `entity_store` is reserved for the core resolution primitives (link, unlink, group). @romulets asked for the rationale and accepted the BFF-vs-core-primitive distinction. (PR [#260006](https://github.com/elastic/kibana/pull/260006) @romulets; mining-report.md:241-248, slack-signal.md:34-40)

- **`useSearchEntities` must exclude ineligible candidates from the add-entity search** — The DSL bool query in the interactive flow excludes already-grouped IDs, entities that already have `resolved_to`, and entities with resolution risk scores (`hooks/use_search_entities.ts:29-38`). Surfacing aliases or already-resolved entities as link candidates would let a reviewer-invisible bug create invalid groups. (code-architecture.md:141)

- **Watermark field for the automated resolution maintainer must be `last_seen`, not `@timestamp`** — `@timestamp` is reset daily by the historical-snapshot operation, so an `@timestamp` watermark forces the maintainer to re-process all matching entities after every snapshot. The agreed fix is `last_seen` (planned `last_seen = LAST(@timestamp)`), deferred to a follow-up once `last_seen` is available (~9.4). (PR [#257479](https://github.com/elastic/kibana/pull/257479) @uri-weisman, follow-up [#258574](https://github.com/elastic/kibana/pull/258574); mining-report.md:252-259, slack-signal.md:42-48) ⚠️ needs expert confirmation: did the `last_seen` switch actually ship? slack-signal.md:48 notes `run.ts:121` may still show `first_seen`/`@timestamp` — and confirm the automated maintainer is in-scope for this domain (it may live under `maintainers/`, outside the four scanned `domain_paths`).

## Security considerations

- **The CSV upload route is enterprise-license-gated and must stay that way** — The license check at `routes/upload_csv.ts:60` is the access boundary for the resolution feature; any new resolution route that exposes link/unlink capability must enforce the same gate before touching entity data. Removing or reordering this check past client acquisition or file processing would expose the capability below its licensing tier. (code-architecture.md:133; PR [#260548](https://github.com/elastic/kibana/pull/260548))

## Performance constraints

- **CSV match expansion is the hot path; groups are assumed small (well under 1,000 entities)** — A single broad CSV row can match a very large number of entities; the 1k-per-row cap (`csv_upload.ts:194-200`) is the load-bearing guard against memory blow-up at enterprise scale. Both this cap and `MAX_RESOLUTION_SEARCH_SIZE` encode the small-group assumption. Any change that widens the per-row matching query, raises the cap, or could produce arbitrarily large groups must be weighed against enterprise-scale memory. (mining-report.md:356, code-architecture.md:137; PR [#260006](https://github.com/elastic/kibana/pull/260006) @hop-dev)

## Historical catches

- [PR #260006](https://github.com/elastic/kibana/pull/260006) — @hop-dev caught that the CSV-upload entity-matching loop paginated indefinitely and accumulated all matched IDs in memory with no upper bound; the 1k-per-row cap was added in follow-up [#260475](https://github.com/elastic/kibana/pull/260475) — A generic reviewer would not know resolution groups are expected to be tiny, so an unbounded match loop looks harmless rather than a memory-exhaustion risk. (mining-report.md:165-171)

- [PR #255334](https://github.com/elastic/kibana/pull/255334) — @maxcold switched to throwing a `ResolutionSearchTruncatedError` instead of silently continuing after a truncated ES search response, which would otherwise produce a `ResolutionGroup` with the wrong `group_size` and missed aliases that bypass link validation — A generic reviewer would not connect a truncated search to downstream link-validation correctness. (mining-report.md:155-161) *(Anchored to the `entity_store` plugin domain client — see Shared conventions.)*

- [PR #257479](https://github.com/elastic/kibana/pull/257479) — @uri-weisman caught that an `@timestamp` watermark for the automated resolution maintainer would re-process every matching entity after each daily historical snapshot (which resets `@timestamp`) — A generic reviewer would not know the snapshot operation rewrites `@timestamp` daily. (mining-report.md:252-259)

- [PR #260548](https://github.com/elastic/kibana/pull/260548) — @macroscopeapp caught a test whose `beforeEach` mocked `useHasEntityResolutionLicense` as `false` while the test body still asserted the license-gated `RESOLUTION_GROUP` tab was present — A generic reviewer would not know the tab is conditional on the resolution license hook and that the mock and assertion had drifted apart. (mining-report.md:105-111)

## Documentation

- [Entity resolution](https://www.elastic.co/docs/solutions/security/advanced-entity-analytics/entity-resolution) — Elastic official docs

## Who to contact

- @elastic/contextual-security-apps — CODEOWNERS for `entity_resolution`, `entity_resolution_file_uploader`, server `entity_resolution`, and the integration test suite (.github/CODEOWNERS:3293-3297)
- @elastic/security-entity-analytics — CODEOWNERS for the public/server `entity_resolution` components and the file-uploader common types (.github/CODEOWNERS:3293-3296)
- @maxcold / Maxim Kholod (`U03E2MLHW1E`) — sole builder of the entity resolution area; architecture, data model, and current implementation questions (slack-signal.md:92)
- @romulets — Entity Store internals (separate team owning the underlying `@kbn/entity-store` plugin); enforcer of ES-calls-in-infra, bulk-update-by-id, and BFF-layering conventions (slack-signal.md:93)
- @Uri Weisman (`U02SNJQB3RU`) — automated resolution maintainer design, watermark field conventions (slack-signal.md:94)
- @hop-dev — CSV upload performance, per-row entity match cap, asset-criticality precedent (slack-signal.md:95)
- @MadameSheema — Cypress test architecture for entity analytics specs (slack-signal.md:96)

## Shared conventions

These patterns were surfaced in the mined PRs and Slack but apply to the broader Entity Store / Entity Analytics system rather than specifically to the entity-resolution `domain_paths`. Reviewers working here should be aware of them, but they are not Entity-Resolution-specific rules.

- **All Elasticsearch calls live in `server/infra/elasticsearch/`, not in domain clients** — Domain clients (e.g. `ResolutionClient`) must not call `esClient` directly. This is an `entity_store`-plugin-wide layering convention (a sibling plugin owned by `@elastic/core-analysis`), held firm across two threads. (PR [#255334](https://github.com/elastic/kibana/pull/255334) @romulets; mining-report.md:115-122, slack-signal.md:10-16)

- **Writes to entity fields use bulk update by `_id` with `retry_on_conflict`, not `updateByQuery` with painless** — Entity IDs are MD5 hashes, so bulk update by document `_id` with `retry_on_conflict` is the concurrency-safe path (matching the main entity-extraction ingest), avoiding silent overwrites of concurrent changes. Applies to `entity_store` ES writes broadly, including the `resolved_to` writes that back this domain's link/unlink. (PR [#255334](https://github.com/elastic/kibana/pull/255334) @romulets; mining-report.md:125-131, slack-signal.md:18-24)

- **Shared fetch-and-validate logic for link and unlink must be extracted, not duplicated** — `linkEntities` and `unlinkEntities` share entity fetch + validation; both must call one shared method (e.g. `fetchAndValidateEntities`). Lives in the `entity_store` `ResolutionClient`. (PR [#255334](https://github.com/elastic/kibana/pull/255334) @romulets; mining-report.md:135-141, slack-signal.md:58-64)

- **Domain client files use a folder-with-`index.ts` structure** — Clients live at `<name>/index.ts` (tests in the same folder), not as flat `<name>.ts` files. An active `entity_store`-wide migration is in progress, so reviewers should flag regressions. (PR [#255334](https://github.com/elastic/kibana/pull/255334) @romulets; mining-report.md:145-151, slack-signal.md:50-56)

- **Cypress entity_analytics specs use the screens/tasks separation and intercept the network request for timing** — `data-test-subj` selectors go in `cypress/screens/<domain>/`, reusable interactions in `cypress/tasks/<domain>/`; waits must `cy.intercept` the underlying request and use chained `.should('contain')` rather than `.within()` or synchronous jQuery DOM snapshots. Applies to all `cypress/e2e/entity_analytics/**` specs (outside the scanned `domain_paths`; also raised as a NIT in PR #266589). (PR [#258892](https://github.com/elastic/kibana/pull/258892) @MadameSheema; mining-report.md:175-211, slack-signal.md:74-88)

- **Risk-score maintainer pipeline rules** — A large set of correctness/telemetry/concurrency invariants (explicit parse-error handling, reporting error messages in telemetry, catching `resource_already_exists_exception` in concurrent index creation, not double-emitting stage telemetry, running `pruneLookupIndex` unconditionally so the lookup index does not grow unbounded, preserving earlier specific resolution-map entries against later generic `self` upserts, keeping pipeline steps small and linear) were mined from PR [#259732](https://github.com/elastic/kibana/pull/259732), but they all anchor to `risk_score/maintainer/**` — a sibling sub-domain outside the scanned `domain_paths`. They are not entity-resolution invariants; a resolution reviewer touching the automated maintainer should apply them. (mining-report.md:15-101)
