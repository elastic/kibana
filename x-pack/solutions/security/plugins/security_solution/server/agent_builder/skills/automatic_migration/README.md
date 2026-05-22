# Automatic Migration Skills

Two Agent Builder skills that improve SIEM rule migration quality on the
in-product Agent Builder chat surface (`POST /api/agent_builder/converse`).
The six registered tools that back the skills are also exposed over the
Agent Builder MCP server (`/api/agent_builder/mcp`), so external MCP
clients (IDEs, custom apps) can drive the same operations directly — but
**the skills themselves are not exposed over MCP**. MCP clients see the
tool list only; skill orchestration (SKILL.md "when to use", per-skill
tool subsetting, structural-confirmation prompts) is an in-product
concept driven by `defineSkillType` registrations and the
`/api/agent_builder/converse` agent loop. See "Surface model" below for
the full integration contract.

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
  `security.migration_translated_rules_search` and
  `security.migration_translated_rule_get` (read-only). Write operations
  (rule update) use `platform.workflows.workflow_execute_step` with
  `kibana.request` targeting the canonical
  `PATCH /internal/siem_migrations/rules/{migration_id}/rules` route.
  This route applies `withLicense`, `withExistingMigration`, audit logging,
  and ES|QL re-validation (`translation_result` recomputation via
  `transformToInternalUpdateRuleMigrationData`). The platform's HITL dialog
  gates execution of the destructive step. ✅
- **Phase 3** — `automatic-migration-context` backing registry tools:
  `security.migration_resources_list` and
  `security.migration_resource_remove`. Write operations (resource upsert)
  use `platform.workflows.workflow_execute_step` with `kibana.request`
  targeting `POST /internal/siem_migrations/rules/{migration_id}/resources`.
  Remove is the only operation still backed by a direct-ES delete because
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

## Surface model

The two skills and the six tools are visible to different surfaces. This
matters when integrating from an external app such as
`example-mcp-app-security` — the integration contract is not "invoke a
skill" but "consume a tool set the skills happen to also drive".

| Surface | Skills auto-activate? | Tools available? | Notes |
| --- | --- | --- | --- |
| `POST /api/agent_builder/converse` (in-product chat) | yes — registered skills are loaded into the agent loop; the model picks one via SKILL.md "When to use" | yes — every registered tool is callable | The orchestration path the SKILL.md content was written for. |
| `POST /api/agent_builder/mcp` (Agent Builder MCP server) | **no** — the MCP server iterates the tool registry and calls `server.tool(...)` for each tool; there is no `server.skill(...)` | yes — same tool list as the chat surface, optionally filtered by the `?namespace=` query param | MCP clients (Claude Desktop, Cursor, VS Code, the `example-mcp-app-security` reference app) drive their own LLM loop with their own system prompt; the SKILL.md content can be replicated client-side as prompt material, but it is not auto-loaded. |
| `GET /api/agent_builder/skills` | n/a — read-only enumeration | n/a | Returns the SKILL.md metadata so callers can render a picker, but invoking a skill from this surface is not supported. |
| `GET /api/agent_builder/tools` | n/a — read-only enumeration | yes — same tool list as MCP | Useful for clients that want to validate tool ids before invoking via MCP. |

Practical consequences for external MCP consumers (including the
`example-mcp-app-security` reference app):

- The six migration tools (`security.migration_translated_rules_search`,
  `…_get`, `…_update`, `security.migration_resources_list`, `…_upsert`,
  `…_remove`) ARE the integration surface — invoke them directly over
  MCP.
- The "guided" UX the SKILL.md content describes (per-rule diff preview,
  uniform-diagnosis check, single-batch confirmation, "applies on the
  next translation run" semantics) is **not free over MCP**. An external
  app that wants that UX has to either (a) re-run the chat surface
  (`POST /api/agent_builder/converse`) which keeps the skill orchestration
  inside Kibana, or (b) copy the SKILL.md content into its own host
  prompt and drive the MCP tools with its own LLM. The skill files in
  this directory are the source of truth for (b).
- The destructive `confirm: z.literal(true)` gate is enforced at the
  **tool schema** layer, so it works identically on both surfaces:
  MCP clients calling the update / upsert / remove tools must surface a
  confirmation step in their host UI before passing `confirm: true`.

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
