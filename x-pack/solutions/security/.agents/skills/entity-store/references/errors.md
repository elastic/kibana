# Entity Store Error Classes

All errors in `server/domain/errors/`. Exported from `errors/index.ts`.

## Resolution Errors

| Error Class | HTTP | Condition |
|-------------|------|-----------|
| `SelfLinkError` | 400 | Target ID included in entity_ids |
| `EntitiesNotFoundError` | 404 | One or more entity IDs don't exist |
| `MixedEntityTypesError` | 400 | Entities have different types (can't link host to user) |
| `ChainResolutionError` | 400 | Entity already has `resolved_to` (would create chain) |
| `EntityHasAliasesError` | 400 | Entity being linked has aliases pointing to it (must unlink first) |
| `ResolutionSearchTruncatedError` | 500 | ES search hit max results during resolution query |
| `ResolutionUpdateError` | 500 | Bulk update during resolution partially failed |

## CRUD Errors

| Error Class | HTTP | Condition |
|-------------|------|-----------|
| `EntityAlreadyExistsError` | 409 | Create with existing EUID |
| `BadCRUDRequestError` | 400 | Invalid CRUD request (missing fields, bad format) |
| `DocumentVersionConflictError` | 409 | Concurrent update conflict |

## General Errors

| Error Class | HTTP | Condition |
|-------------|------|-----------|
| `EntityNotFoundError` | 404 | Entity not found by ID |
| `EntityStoreNotRunningError` | 400 | Operation requires entity store to be running |

## Important: Unlink Behavior

Unlinking a non-alias entity does **NOT** throw an error. Instead, the entity ID appears in the `skipped` array of the `UnlinkResult`:

```typescript
interface UnlinkResult {
  unlinked: string[];  // successfully unlinked alias entities
  skipped: string[];   // entities without resolved_to (silently skipped)
}
```
