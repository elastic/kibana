# Automatic Migration Skills

Two Agent Builder skills that improve SIEM rule migration quality from both
in-product chat and MCP / IDE clients.

## Skills

| Skill                            | When                                                            | Status |
| -------------------------------- | --------------------------------------------------------------- | ------ |
| `automatic-migration-correction` | Polish a translated rule (ES\|QL fix, MITRE remap, severity)    | Phase 2a — content + registry tools; inline tool handlers TODO |
| `automatic-migration-context`    | Seed translation with docs, naming conventions, lookup data     | Phase 2a — content + registry tools; inline tool handlers TODO |

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
- **Phase 2b** — `automatic-migration-correction` inline tool handlers:
  rule retrieval, ES|QL repair scaffolding, MITRE remapping, persistence with
  `confirmation` primitive. Will use `workflow_execute_step` /
  `kibana.request` per
  [workflow-step-conventions](../../../../../../../../../packages/kbn-workflows/scripts/generate_kibana_connectors/included_operations.ts).
- **Phase 3** — `automatic-migration-context` inline tool handlers: resource
  list / upsert / remove with `confirmation` primitive for destructive ops.
- **Phase 4** — `@kbn/evals-suite-siem-migrations` package: skill-invocation,
  trajectory, trace-based, schema-compliance, and (for ES|QL repair)
  functional-equivalence evaluators.
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
