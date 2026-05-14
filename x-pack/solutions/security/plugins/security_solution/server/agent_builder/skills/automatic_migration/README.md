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
  `security.migration_translated_rule_update`. Destructive update gated by
  schema-enforced `confirm: z.literal(true)`. Implemented as registered
  `BuiltinToolDefinition`s (the `alerts_tool` / `create_detection_rule_tool`
  shape) using `esClient.asCurrentUser` against
  `.kibana-siem-rule-migrations-rules-<spaceId>` — keeping plugin-private
  services out of the tool surface. ✅
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
