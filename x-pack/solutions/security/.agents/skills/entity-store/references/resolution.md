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
FROM .entities.v2.latest.security_default
| WHERE entity.id == "user:emily@okta"
   OR entity.relationships.resolution.resolved_to == "user:emily@okta"

-- Get only target entities (for data grids — excludes aliases)
FROM .entities.v2.latest.security_default
| WHERE entity.relationships.resolution.resolved_to IS NULL

-- Get truly standalone entities (INLINESTATS pattern)
FROM .entities.v2.latest.security_default
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

## Field Retention

LOOKUP JOIN + COALESCE ensures resolution fields survive extraction runs:
```esql
FROM logs-*
| WHERE user.name IS NOT NULL
| STATS ...
| LOOKUP JOIN .entities.v2.latest.security_default ON user.name
| EVAL entity.relationships.resolution.resolved_to = COALESCE(
    entity.relationships.resolution.resolved_to, null
  )
```
