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
  structural gate. The update handler routes through the canonical SIEM
  migration data layer via
  `siemMigrationsService.createRulesClient(...).data.items.update`, reusing
  the same `transformToInternalUpdateRuleMigrationData` helper as the
  `PATCH /internal/siem_migrations/rules/{migration_id}/rules` route — so
  ES|QL re-validation (`translation_result` recomputation) stays in lock-
  step with the canonical helper rather than via a duplicated inline copy.
  Audit logging emits via `core.security.audit.asScoped(request)` against
  the `SiemMigrationsAuditActions` action set. ✅
- **Phase 3** — `automatic-migration-context` backing registry tools:
  `security.migration_resources_list`, `security.migration_resource_upsert`,
  and `security.migration_resource_remove`. Destructive ops gated by
  schema-enforced `confirm: z.literal(true)`. Upsert routes through
  `siemMigrationsService.createRulesClient(...).data.resources.upsert`
  (same canonical client as the
  `POST /internal/siem_migrations/rules/{migration_id}/resources` route);
  remove is the only operation still backed by a direct-ES delete because
  the canonical resources client exposes a bulk `prepareDelete` (all
  resources for a migration) but no per-resource delete method —
  documented as a known architectural seam below. ✅
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

## Architectural Seams

Per the address-known-limitations triage matrix, each entry below is a
**permanent constraint** of the current platform surface, paired with a
concrete fallback and the trigger that would re-open the decision.
Scheduled-fix items are **not** allowed in this section — anything that
could be fixed in this cycle has been fixed.

### 1. Per-resource delete uses direct-ES against the resources index

- **Where:** `tools/migration_resources_tools.ts ::
  migrationResourceRemoveTool`.
- **What it does:** `esClient.asCurrentUser.deleteByQuery({ index:
  '.kibana-siem-rule-migrations-resources-<spaceId>', query: { bool: {
  must: [{ term: { migration_id } }, { term: { type } }, { term: { name }
  }] } }, refresh: true })`.
- **Why direct-ES:** the canonical
  `SiemMigrationsDataResourcesClient` (which the resource upsert path
  routes through) exposes a bulk `prepareDelete` that removes **all**
  resources for a migration — there is no per-resource (`{ type, name }`-
  scoped) delete method on the client today. Re-implementing one on the
  agent-builder side would require either (a) widening the canonical
  client surface (out of scope for this PR — it is a contract change on a
  shared service) or (b) loading every resource for the migration into
  memory just to drop one and write the rest back, which is strictly
  worse than the direct `deleteByQuery`. The tool handler still wraps the
  call with `core.security.audit.asScoped(request)` to emit the same
  `SIEM_MIGRATION_DELETED` action the canonical path would.
- **Fallback / monitoring trigger:** if the canonical resources client
  gains a `data.resources.remove({ migration_id, type, name })` method,
  this tool should switch to it in the same PR. Detection: a `kbn-evals`
  trajectory regression that asserts the tool's `extra_tools` set stays
  bounded to `esClient` — the moment it includes a registry method on
  `ruleMigrationsClient.data.resources`, this seam closes.

### 2. Audit logging emits via `core.security.audit.asScoped` instead of `SiemMigrationAuditLogger`

- **Where:** all three writing tools — `migrationTranslatedRuleUpdateTool`,
  `migrationResourceUpsertTool`, `migrationResourceRemoveTool`.
- **What it does:** maps each handler outcome to one of the
  `SiemMigrationsAuditActions` enum values and calls
  `core.security.audit.asScoped(request).log({...})` directly.
- **Why not `SiemMigrationAuditLogger`:** the canonical audit logger is
  constructed from a `SecuritySolutionApiRequestHandlerContext`
  (`context.securitySolution.getAuditLogger(...)`) which is not
  available in `BuiltinToolDefinition` handler context. Synthesising one
  inside a tool handler would mean reconstructing a request-handler
  context that the tool surface explicitly is not — that is a
  cross-layer leak.
- **Fallback / monitoring trigger:** if the platform exposes a
  request-scoped audit-logger factory that does not require the full
  request-handler context (e.g. `core.security.audit.asScoped(request)
  .withCategory('siem_migrations')`), the tools should adopt it in the
  same PR that ships the platform helper. Detection: a periodic
  schema-drift check on `SiemMigrationsAuditActions` — if a new action
  is added to that enum but not consumed here, the auditing surface has
  drifted and needs reconciling.

### 3. The migration model carries no `tags` field on a translated rule

- **Where:** `migrationTranslatedRuleUpdateTool.ruleUpdatePatchSchema`.
- **What is allowed:** `query`, `severity`, `risk_score`, `description`.
- **What is not allowed:** `tags`, `false_positives`, `references`,
  `name`, custom fields. The schema is intentionally a strict subset of
  `ElasticRulePartial` because the underlying migration draft (an
  `ElasticRule` saved-object payload) does not carry those fields until
  the rule is installed via the regular detection-engine flow.
- **Fallback:** for tag / reference / false-positive edits, the operator
  should first install the migrated rule from the migration UI, then use
  the regular `detection-rule-edit` skill (or the rules-management UI)
  to apply the edit on the installed rule.
- **Monitoring trigger:** if `ElasticRule` gains a `tags` field on the
  migration model (`common/siem_migrations/model/rule_migration.gen.ts`),
  add `tags` to `ruleUpdatePatchSchema` and add coverage in the eval
  suite. Detection: a type-check regression — `ElasticRulePartial`
  becomes a strict superset of the patch schema if `tags` lands.
