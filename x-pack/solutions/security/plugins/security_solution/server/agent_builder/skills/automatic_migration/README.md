# Automatic Migration Skills

Two Agent Builder skills that improve SIEM rule migration quality from both
in-product chat and MCP / IDE clients.

## Skills

| Skill                            | When                                                            | Phase |
| -------------------------------- | --------------------------------------------------------------- | ----- |
| `automatic-migration-correction` | Polish a translated rule (ES\|QL fix, MITRE remap, severity)    | 2     |
| `automatic-migration-context`    | Seed translation with docs, naming conventions, lookup data     | 3     |

Both skills are gated behind the `automaticMigrationSkillsEnabled` experimental
feature flag (`x-pack/.../common/experimental_features.ts`) and stay off in
production until all phases land.

## Layout

```
automatic_migration/
├── README.md                                  # this file
├── index.ts                                   # public barrel
├── automatic_migration_correction_skill.ts    # Phase 2 (stub in Phase 1)
├── automatic_migration_context_skill.ts       # Phase 3 (stub in Phase 1)
└── shared/
    ├── index.ts                               # barrel
    └── schemas.ts                             # Zod base schemas
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

- **Phase 1 (this commit)** — feature flag, RBAC audit, shared schemas, skill
  stubs registered under the flag.
- **Phase 2** — `automatic-migration-correction` tool handlers, eval coverage.
- **Phase 3** — `automatic-migration-context` tool handlers, eval coverage.
- **Phase 4** — `@kbn/evals-suite-siem-migrations` package wiring both skills.
- **Phase 5** — end-to-end verification + draft PR.

## RBAC

The Phase 1 audit (see proposal `phase-1-foundation/proposal.md`) found that
the existing `SIEM_MIGRATIONS_API_ACTION_ALL` privilege
(`x-pack/solutions/security/packages/features/src/actions.ts`) already covers
the create/update/delete operations on `rule_migrations` and `siem_migrations`
saved objects that Phase 2/3 tool handlers will touch. **No new capability
constants are introduced in Phase 1.** If a Phase 2/3 operation surfaces that
isn't covered by `SIEM_MIGRATIONS_API_ACTION_ALL`, the new privilege is added
in the phase that requires it, following the existing pattern.
