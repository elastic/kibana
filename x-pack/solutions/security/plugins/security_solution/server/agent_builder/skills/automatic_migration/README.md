# Automatic Migration Skills

Two Agent Builder skills that improve SIEM rule migration quality from both
in-product chat and MCP / IDE clients.

## Skills

| Skill                            | When                                                            | Status |
| -------------------------------- | --------------------------------------------------------------- | ------ |
| `automatic-migration-correction` | Polish a translated rule (ES\|QL fix, MITRE remap, severity)    | ✅ content + 3 backing registry tools (Phase 2a + 2b) |
| `automatic-migration-context`    | Seed translation with docs, naming conventions, lookup data     | ✅ content + 3 backing registry tools (Phase 2a + 3) |

Both skills are gated behind the `automaticMigrationSkillsEnabled` experimental
feature flag (`x-pack/.../common/experimental_features.ts`) and stay off in
production until all phases land.

## Layout

```
automatic_migration/
├── README.md                                  # this file
├── index.ts                                   # public barrel
├── automatic_migration_correction_skill.ts    # 5-section SKILL.md + registry tools (Phase 2a)
├── automatic_migration_context_skill.ts       # 5-section SKILL.md + registry tools (Phase 2a)
└── shared/
    ├── index.ts                               # barrel
    └── schemas.ts                             # Zod base schemas (incl. confirmDestructiveSchema)
```

## Shared schemas

`shared/schemas.ts` is the single source of truth for the domain vocabulary that
both skills consume:

- `translatedRuleSchema` — mirrors `ReferenceRule` from
  `@kbn/evals-suite-security-ai-rules`.
- `mitreThreatSchema`, `severitySchema`, `riskScoreSchema`, `intervalSchema` —
  validators for the detection-rule fields the correction skill mutates.
- `migrationIdSchema` — UUID-typed identifier for a `rule_migrations` saved
  object.
- `confirmDestructiveSchema` — `z.object({ confirm: z.literal(true) })`. **All
  destructive tool handlers (Phase 2 persist, Phase 3 resource deletion) MUST
  compose this shape** so consent is structurally enforced, not implied by
  prose.

`shared/schemas.ts` must remain a pure Zod module — no plugin-internal imports
— so it stays consumable from both skills and from tests.

## Roadmap

- **Phase 1 (commit 1)** — feature flag, RBAC audit, shared schemas, skill
  stubs registered under the flag. ✅
- **Phase 2a (commit 2)** — comprehensive 5-section SKILL.md content for both
  skills, registry-tool wiring (`generateEsql`, `productDocumentation`,
  `security.security_labs_search`). ✅
- **Phase 2b** — `automatic-migration-correction` backing registry tools:
  `security.migration_translated_rules_search`,
  `security.migration_translated_rule_get`, and
  `security.migration_translated_rule_update`. The update tool accepts an
  `updates: [{ rule_id, patch }]` array (capped at 50) so single-rule and
  bulk corrections share one tool surface and one `confirm: z.literal(true)`
  structural gate. ES|QL queries are re-validated on save via
  `parseEsqlQuery` from `@kbn/securitysolution-utils`; the handler writes
  `translation_result` (`full` / `partial` / `untranslatable`) alongside
  the patch — mirroring the in-tree route helper
  `convertEsqlQueryToTranslationResult`. Implemented as registered
  `BuiltinToolDefinition`s (the `alerts_tool` /
  `create_detection_rule_tool` shape) using `esClient.asCurrentUser`
  against `.kibana-siem-rule-migrations-rules-<spaceId>` — keeping
  plugin-private services out of the tool surface. ✅
- **Phase 3** — `automatic-migration-context` backing registry tools:
  `security.migration_resources_list`, `security.migration_resource_upsert`,
  and `security.migration_resource_remove`. Destructive ops gated by
  schema-enforced `confirm: z.literal(true)`. Same registered-tool shape
  against `.kibana-siem-rule-migrations-resources-<spaceId>`. ✅
- **Phase 4** — eval suite extension. The existing
  `@kbn/evals-suite-security-automatic-migrations` package gets a `src/skills/`
  subsystem (chat client + `createEvaluateMigrationSkillsDataset`) and two
  spec files under `evals/skills/`:
  - `automatic_migration_correction.spec.ts` — 4 happy-path scenarios + 3
    distractors.
  - `automatic_migration_context.spec.ts` — 4 happy-path scenarios + 3
    distractors.
  Each example runs both an LLM-judged criteria evaluator (with skill-specific
  baseline contract) and `createSkillInvocationEvaluator` so SKILL.md
  activation is gated, not freelanced. Distractors flip the criteria evaluator
  into "must NOT activate" mode via `metadata.distractor = true`. Trajectory +
  schema-compliance evaluators are stubbed via per-example
  `metadata.tool_sequence` for the next iteration. ✅
- **Phase 5** — `verify-and-self-fix` audit on the full branch, lift the PR
  out of draft.

## RBAC

The Phase 1 audit (see proposal `phase-1-foundation/proposal.md`) found that
the existing `SIEM_MIGRATIONS_API_ACTION_ALL` privilege
(`x-pack/solutions/security/packages/features/src/actions.ts`) already covers
the create/update/delete operations on `rule_migrations` and `siem_migrations`
saved objects that Phase 2/3 tool handlers will touch. **No new capability
constants are introduced in Phase 1.** If a Phase 2/3 operation surfaces that
isn't covered by `SIEM_MIGRATIONS_API_ACTION_ALL`, the new privilege is added
in the phase that requires it, following the existing pattern.

## Known Limitations

Scheduled-fix items only — each entry names the fix shape, the driver
path, and the test name that will pass once it lands. Acknowledgement-
only entries are not allowed here; if a limitation cannot be fixed in
this cycle it carries a concrete follow-up commitment.

### 1. Translated-rule update tool writes directly to ES instead of routing through the migration PATCH endpoint

- **Where:** `tools/migration_translated_rules_tools.ts ::
  migrationTranslatedRuleUpdateTool`.
- **What it does today:** `esClient.asCurrentUser.update({ index:
  '.kibana-siem-rule-migrations-rules-<spaceId>', id: ruleId, doc, refresh:
  'wait_for' })`, with ES|QL re-validation inlined via `parseEsqlQuery`
  from `@kbn/securitysolution-utils`. Mirrors the route helper's
  `convertEsqlQueryToTranslationResult` semantics.
- **What it bypasses:** the
  `PATCH /internal/siem_migrations/rules/{migration_id}/rules` route
  pipeline — specifically `withLicense`, `withExistingMigration`,
  `logUpdateRules` audit emission via `SiemMigrationAuditLogger`, and any
  future middleware that route accumulates.
- **Why this shape for now:** the inline `BuiltinToolDefinition`
  handler context only exposes `esClient`, `savedObjectsClient`,
  `spaceId`, `request` — not `ruleMigrationsClient`. Calling the
  internal route from a tool handler via `core.http.fetch` is its own
  anti-pattern (inline tool wrapping a single internal HTTP route);
  the canonical alternative is
  `platform.workflows.workflow_execute_step` with
  `step.type: kibana.request`, which requires a workflow YAML
  attachment mechanism that has zero in-tree precedent among
  `security_solution` Agent Builder skills (every existing tool —
  `alertsTool`, `attackDiscoverySearchTool`, etc. — uses the same
  direct-ES pattern). Pioneering it on this PR would change the
  conversational UX in ways not currently runtime-validatable.
- **Fix sketch (scheduled):** refactor `migrationTranslatedRuleUpdateTool`
  to a registry-tool shape that receives the full plugin setup contract,
  obtain `ruleMigrationsClient` from the `securitySolution` start
  contract, and delegate to `ruleMigrationsClient.data.items.update(...)`
  (the same method the existing PATCH route calls via
  `transformToInternalUpdateRuleMigrationData`). This restores
  middleware reuse without depending on the workflow-YAML attachment
  primitive.
- **Driver file:** the registry-tool refactor will live in
  `tools/migration_translated_rules_tools.ts` (rename / split as
  needed) and be wired in `tools/register_tools.ts`.
- **Test name:** `migration_translated_rules_tools (registry shape)
  > update tool delegates to ruleMigrationsClient.data.items.update
  with audit + license + existing-migration middleware applied`.
- **Tracking:** see PR description follow-ups; the schema and skill
  prose are stable across this refactor (the change is implementation
  shape, not the agent-facing contract).

### 2. Resource upsert / remove tools share the same direct-ES shape

- **Where:** `tools/migration_resources_tools.ts ::
  migrationResourceUpsertTool` and `migrationResourceRemoveTool`.
- **What they bypass:** the
  `POST` and `DELETE` variants of
  `/internal/siem_migrations/rules/{migration_id}/resources`.
- **Scheduled-fix:** same refactor pattern as Limitation #1 — move
  to a registry-tool shape that consumes the migrations client.
- **Test name:** `migration_resources_tools (registry shape) > upsert
  / remove delegate to ruleMigrationsClient.data.resources.*`.

These two are bundled into one follow-up PR (post-merge of the current
draft) since they share the registry-tool refactor scaffolding.

### 3. No regression test asserts ES|QL re-validation parity with the route helper

- **Why this matters:** if the route helper
  (`convertEsqlQueryToTranslationResult` in
  `lib/siem_migrations/rules/api/util/update_rules.ts`) changes its
  semantics for empty strings / aggregating queries / parser-error
  classification, the inline copy in `migration_translated_rules_tools.ts`
  will silently drift.
- **Scheduled-fix:** unit test that feeds a small fixture set
  (empty string, valid query, aggregating query, syntax-error query,
  unknown-function query) into both the inline path and
  `parseEsqlQuery` itself, asserting `translation_result` is
  identical to what `convertEsqlQueryToTranslationResult` would
  produce.
- **Test name:** `migration_translated_rules_tools >
  convertQueryToTranslationResult matches the route helper for the
  shared fixture set`.
- **Lands with:** the registry-tool refactor (#1), at which point
  the inline helper is deleted in favour of importing the route
  helper directly.
