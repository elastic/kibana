# Automatic Migration Skills

Two Agent Builder skills that improve SIEM rule migration quality on the
in-product Agent Builder chat surface (`POST /api/agent_builder/converse`).
The read-only tools that back the skills are also exposed over the
Agent Builder MCP server (`/api/agent_builder/mcp`), so external MCP
clients (IDEs, custom apps) can drive the same queries directly — but
**the skills themselves are not exposed over MCP**. MCP clients see the
tool list only; skill orchestration (SKILL.md "when to use", per-skill
tool subsetting, structural-confirmation prompts) is an in-product
concept driven by `defineSkillType` registrations and the
`/api/agent_builder/converse` agent loop.

## Skills

| Skill                            | When                                                            | Status |
| -------------------------------- | --------------------------------------------------------------- | ------ |
| `automatic-migration-correction` | Polish a translated rule (ES\|QL fix, MITRE remap, severity)    | ✅ content + 3 backing tools |
| `automatic-migration-context`    | Seed translation with docs, naming conventions, lookup data     | ✅ content + 1 backing tool |

Both skills are gated behind the `automaticMigrationSkillsEnabled` experimental
feature flag (`x-pack/.../common/experimental_features.ts`) and stay off in
production until all phases land.

## Architecture

### Read-only registry tools (registered via `registerTools`)

| Tool ID | Purpose |
| --- | --- |
| `security.migration_translated_rules_search` | Search/list translated rules in a migration |
| `security.migration_translated_rule_get` | Get full details of a single translated rule |
| `security.migration_resources_list` | List context resources (macros, lookups) for a migration |

### Write operations (via `workflow_execute_step` + `kibana.request`)

All destructive operations route through the platform's workflow step
mechanism, which targets canonical migration HTTP routes:

- **Rule update**: `PATCH /internal/siem_migrations/rules/{migration_id}/rules`
  Applies `withLicense`, `withExistingMigration`, audit logging, and
  ES|QL re-validation (`translation_result` recomputation).
- **Resource upsert**: `POST /internal/siem_migrations/rules/{migration_id}/resources`
  Applies license checks and audit logging.

The platform's HITL dialog gates execution of every destructive step.
Resource removal is not supported by these skills.

## Layout

```
automatic_migration/
├── README.md                                  # this file
├── index.ts                                   # public barrel
├── automatic_migration_correction_skill.ts    # 5-section SKILL.md + registry tools
├── automatic_migration_context_skill.ts       # 5-section SKILL.md + registry tools
└── shared/
    ├── index.ts                               # barrel
    └── schemas.ts                             # Zod base schemas
```

## RBAC

The existing `SIEM_MIGRATIONS_API_ACTION_ALL` privilege covers all
operations on `rule_migrations` and `siem_migrations` saved objects.
No new capability constants are introduced. Write operations inherit
RBAC from the target HTTP routes via `kibana.request`.

## Surface model

| Surface | Skills auto-activate? | Tools available? | Notes |
| --- | --- | --- | --- |
| `POST /api/agent_builder/converse` (in-product chat) | yes | yes — all registered tools | The orchestration path the SKILL.md content was written for. |
| `POST /api/agent_builder/mcp` (Agent Builder MCP server) | **no** | yes — same tool list | MCP clients drive their own LLM loop. |
