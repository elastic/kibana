# Entity Resolution

Links multiple entity records representing the same real-world identity. Resolution data is stored as fields on entity documents — no new indices required.

## Architecture

- **No new indices** — works on existing Entity Store v2 shared index
- **Target Entity** = entity WITHOUT `resolved_to` (also called "golden entity")
- **Alias Entity** = entity WITH `resolved_to` pointing to target's `entity.id`
- **Aggregated Risk** = `entity.relationships.resolution.risk.*` fields on target entity

## ResolutionClient

```typescript
class ResolutionClient {
  linkEntities(targetId: string, rawEntityIds: string[]): Promise<LinkResult>;
  unlinkEntities(rawEntityIds: string[]): Promise<UnlinkResult>;
  getResolutionGroup(entityId: string): Promise<ResolutionGroup>;
}

interface LinkResult { linked: string[]; skipped: string[]; target_id: string; }
interface UnlinkResult { unlinked: string[]; skipped: string[]; }
interface ResolutionGroup {
  target: Record<string, unknown>;
  aliases: Array<Record<string, unknown>>;
  group_size: number;
}
```

Uses `updateByQuery` with Painless to set/remove `resolved_to` on LATEST index.

## ESQL Query Patterns

```esql
-- Get target and its aliases
FROM .entities.v2.latest.default
| WHERE entity.id == "user:emily@okta"
   OR entity.relationships.resolution.resolved_to == "user:emily@okta"

-- Get only target entities (for data grids — excludes aliases)
FROM .entities.v2.latest.default
| WHERE entity.relationships.resolution.resolved_to IS NULL

-- Get truly standalone entities (INLINESTATS pattern)
FROM .entities.v2.latest.default
| WHERE entity.EngineMetadata.Type == "user"
| EVAL golden_id = COALESCE(entity.relationships.resolution.resolved_to, entity.id)
| INLINESTATS group_size = COUNT(*) BY golden_id
| WHERE entity.relationships.resolution.resolved_to IS NULL AND group_size == 1
```

> **INLINESTATS pattern:** To distinguish standalone from target-with-aliases, ALWAYS use `INLINESTATS` in a single query. Never suggest a two-step approach.

## Automated Resolution

Email-based resolution using Entity Maintainers Framework:
1. Collect email values from entities
2. Find matching groups (same email across namespaces)
3. Apply resolutions (IDP entity becomes target)
4. Update `last_seen` watermark

**Non-IDP gap:** Non-IDP entities (`namespace: 'local'`) with `user.email` will be matched with IDP entities. Target selection prioritizes IDP, but false-positive links are possible.

## Custom Resolution Rules

Customer-authored matcher rules, run by the same `automated-resolution` maintainer after the built-in rules. This is an internal, undocumented escape hatch: the routes are internal and absent from the public API reference.

- **Shape:** `namespaces` (required; format-checked only, since values come from `event.module`), optional `filter` (ES|QL boolean expression), `match_value` (ES|QL expression), `decline_same_namespace_duplicates` (default `true`), `enabled` (default `false`), `name`.
- **Engine contract:** the expressions only choose entities and compute the key. Grouping, the 100-entity ceiling, the same-namespace check, target choice, cascade and the watermark are the shared matcher (`EsqlExpressionMatchSpec` in `rule_registry.ts`; query parts in `matcher/query.ts`). The key is wrapped in `TO_STRING(...)`, and the single-value check runs on the computed key (`MV_COUNT(match_value) == 1`).
- **Safety boundary:** each expression is parsed as exactly one ES|QL expression (`parseSingleEsqlExpression`, keeping parentheses) and re-printed from the tree. Only the re-printed text reaches the query. On save, the composed query runs with `LIMIT 0` and without `unmapped_fields="nullify"`, so unknown fields and non-boolean filters are rejected.
- **Storage:** saved-object type `entity-resolution-custom-rule` (per space, hidden from the saved-objects HTTP APIs), separate from `entity-resolution-rule`, which stores only built-in overrides. Both types are granted by the Security feature (`securityV5SavedObjects`): `all` can write them, `read` can read them. The maintainer reads them with the API key owner's user-scoped client. Writes through the routes also need `securitySolution-entity-analytics-manage`. A key owner without Security privileges gets an empty `find`, not an error, so rules and overrides silently don't apply.
- **State:** per rule under `rules["custom:<id>"]`, holding the watermark, `definitionFingerprint` (a hash of the canonical stored definition) and `lastAttemptAt`. A changed fingerprint resets the watermark. Entries for deleted rules are pruned; other unknown ids pass through.
- **Scheduling:**
  - Rules run least recently attempted first, and each is re-read just before it runs.
  - Custom rules stop at a soft deadline: the maintainer's `timeout` minus `CUSTOM_RULES_DEADLINE_MARGIN_MS`. A run Task Manager cancels saves no state for any rule, OOTB included.
  - A rule stopped at the deadline keeps its previous watermark. Its query skips groups whose members already resolve to one root (`MIN(root) != MAX(root)`), so links it made still count as progress.
- **Preview:** `POST …/custom_rules/_preview` runs the first-scan query read-only (up to 10 pages) and classifies groups as the engine would. It reports skips by reason, extend and merge counts, the largest groups, and what it doesn't model.

## Field Retention

LOOKUP JOIN + COALESCE ensures resolution fields survive extraction runs:
```esql
FROM logs-*
| WHERE user.name IS NOT NULL
| STATS ...
| LOOKUP JOIN .entities.v2.latest.default ON user.name
| EVAL entity.relationships.resolution.resolved_to = COALESCE(
    entity.relationships.resolution.resolved_to, null
  )
```
