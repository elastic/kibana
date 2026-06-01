# `administers` Relationship Maintainer — Design Context

> Status: pre-implementation — design decisions resolved, ready to implement
> Last updated: 2026-05-29

---

## What `administers` Means

A user or host entity _administers_ another host when it has explicit management authority over it as recorded by an identity/directory provider. This is not inferred from frequency — it is a direct authoritative signal (e.g. AD `managedObjects` attribute).

Schema definition (entity.schema.yaml):
> "Entities this entity administers (for example, a user who is an admin of a service)."

---

## Integration Source: Active Directory (entityanalytics_ad)

The only current integration implementing `administers` is the Active Directory Entity Analytics integration via PR [elastic/integrations#18337](https://github.com/elastic/integrations/pull/18337).

### How the pipeline writes `administers`

**Source field (raw LDAP attribute):** `activedirectory.user.managed_objects` / `activedirectory.device.managed_objects`
- These contain arrays of LDAP Distinguished Names (DNs) of AD computer objects that the user/device has management rights over.
- The common pipeline renames `managedObjects` → `managed_objects` (camelCase → snake_case) for all fields under the `activedirectory` object.

**Pipeline output (Painless `buildHostRel()`):** Parses each DN and writes:
```json
"user.entity.relationships.administers": {
  "host": {
    "id":   ["CN=Workstation01,OU=Computers,DC=corp,DC=com"],   // full DN
    "name": ["Workstation01"]                                    // CN= component only
  },
  "user": {
    "domain": ["corp.com"]                                       // DC= parts joined
  }
}
```

For device documents, the same structure is written under `host.entity.relationships.administers`.

**Affected data streams:**
- `entityanalytics_ad.entity` (user events → `user.entity.relationships.administers`)
- `entityanalytics_ad.entity` (device events → `host.entity.relationships.administers`)

### What the entity store extraction collects

The extraction pipeline (`common_fields.ts`) uses `collectValues` for all `ENTITY_RELATIONSHIP_COLLECT_LEAVES` × `ENTITY_RELATIONSHIP_IDENTIFIER_FIELDS`. For `administers` this maps:

| Source field on log doc | Destination on entity doc |
|---|---|
| `user.entity.relationships.administers.host.id` | `entity.relationships.administers.raw_identifiers.host.id` |
| `user.entity.relationships.administers.host.name` | `entity.relationships.administers.raw_identifiers.host.name` |
| `host.entity.relationships.administers.host.id` | `entity.relationships.administers.raw_identifiers.host.id` |
| `host.entity.relationships.administers.host.name` | `entity.relationships.administers.raw_identifiers.host.name` |

**`user.domain` is silently dropped** — it is not in `ENTITY_RELATIONSHIP_IDENTIFIER_FIELDS` (`host.id`, `host.name`, `user.id`, `user.name`, `user.email`, `service.name`).

So the entity document ends up with:
```json
"entity.relationships.administers.raw_identifiers": {
  "host": {
    "id":   ["CN=Workstation01,OU=Computers,DC=corp,DC=com"],
    "name": ["Workstation01"]
  }
}
```

---

## Critical Resolution Gap: CN vs FQDN

The entity store uses **`host.name` as the host identity field** (FQDN, e.g. `alejandr-pc210.acmecrm.com`). The AD pipeline sets `host.name` from `activedirectory.device.dns_host_name` (lowercased FQDN).

However, `raw_identifiers.host.name` contains the **bare CN** (e.g. `ALEJANDR-PC210`) — the CN= component of the managed object's DN, NOT the FQDN.

| | Value | Matches entity? |
|---|---|---|
| `raw_identifiers.host.id` | Full DN: `CN=ALEJANDR-PC210,OU=Computers,DC=...` | ❌ never matches `entity.id` = `host:alejandr-pc210.acmecrm.com` |
| `raw_identifiers.host.name` | Bare CN: `ALEJANDR-PC210` | ❌ doesn't match `entity.name` = `alejandr-pc210.acmecrm.com` |

**But** — `host.hostname` IS collected on the entity document (from `activedirectory.device.cn`, which is the bare CN). So the maintainer must resolve `raw_identifiers.host.name` by joining on `host.hostname`, not `host.name`.

**Resolution join key:** `entity.relationships.administers.raw_identifiers.host.name` → match against `host.hostname` on entity documents.

---

## Directionality

**Active/outgoing** — field is written on the administrator (actor), pointing at what they administer (targets).

- User doc: `user.entity.relationships.administers` = hosts this user manages
- Device doc: `host.entity.relationships.administers` = hosts this device manages

This is consistent with all other relationship fields in the schema.

---

## What Happens to `raw_identifiers` After Processing

**Keep as-is.** Do not clear.

Reasons:
1. The entity store extraction uses `collectValues` (aggregation/merge semantics) — clearing `raw_identifiers` on the entity doc would immediately be repopulated on the next extraction run from the source log.
2. Both `raw_identifiers` and `ids` can coexist — `ids` is what the graph UI reads, `raw_identifiers` is the source of truth for what needs resolving.
3. Clearing creates a distributed coordination problem (atomic read-modify-write not supported without scripted updates).

---

## Re-processing Prevention

**Not needed — make it idempotent.**

- Each maintainer run re-resolves the current `raw_identifiers` state.
- Writing to `ids` is a set (dedup at write time via merge logic).
- AD syncs are full-state (not deltas), so re-resolving on every run is cheap and correct.

---

## Documents Generator Changes (security-documents-generator)

File: `src/commands/org_data/integrations/active_directory_integration.ts`

### What was fixed / added

1. **`buildComputerName(employee)`** — new deterministic computer name helper. Uses last 3 digits of `employee.id` as suffix (e.g. `ALEJANDR-PC123`). Both the pre-build `employeeComputerDns` map and `createDeviceDocument` now use this same method so DNs are consistent.

2. **`managedObjects` on user docs** — managers get `managedObjects` populated with the computer DNs of their direct reports' Windows devices. Uses `e.managerId === employee.oktaUserId` (correct — `managerId` stores the manager's `oktaUserId`, not `employee.id`).

3. **`managedObjects` on device docs** — ~15% of devices get 1–2 `managedObjects` referencing actual generated computer DNs from `allComputerDns` (excludes own DN). Removed the old `buildServerManagedObjects()` which generated fictional unresolvable resource names.

4. **Both raw forms written:**
   - `managedObjects` (camelCase — raw event shape before pipeline rename)
   - `managed_objects` (snake_case — post-pipeline shape the entity store extraction reads)
   - This is needed because the generator bypasses the ingest pipeline.

5. **`user.entity.relationships.administers` / `host.entity.relationships.administers`** written directly on the document (post-pipeline output shape) via `buildAdministersFromDns()` — a TypeScript port of the Painless `buildHostRel()` function.

---

## Implementation Plan for the Maintainer

The `administers` maintainer follows the same engine pattern as `accesses` and `communicates_with`. Key differences:

### Kind: `override`

Every config will use `kind: 'override'` because the query must:
1. Read from the entity index (not a log index) — source is `entity.relationships.administers.raw_identifiers.*`
2. Join on `host.hostname` (not `host.name`) to resolve target entities

This is fundamentally different from `accesses`/`communicates_with` which query log indices.

### Engine architecture note

The existing engine (`runRelationshipMaintainer`) runs:
- **Step 1 (composite agg):** discovers actor pages from a log/entity index
- **Step 2 (ES|QL):** computes target EUIDs per actor page
- **Write:** bulk-updates `entity.relationships.administers.ids`

For `administers`, Step 1 should query the **entity index** for entities that have `entity.relationships.administers.raw_identifiers.host.id IS NOT NULL OR host.name IS NOT NULL`.

### Files to create

```
maintainers/administers/
├── configs.ts        — integration configs (entityanalytics_ad user + device)
├── index.ts          — registers the maintainer (cadence: 1d, same as accesses)
└── configs.test.ts   — golden snapshot tests mirroring accesses/configs.test.ts
```

### ES|QL query shape for the maintainer (Step 2)

The actor is an entity with `raw_identifiers` populated. For each actor page, resolve targets:

```esql
FROM .entities.v2.latest.security_default-*
| WHERE host.hostname IN (<raw_identifiers.host.name values for this actor page>)
   OR entity.id IN (<raw_identifiers.host.id values mapped to EUIDs>)
| STATS entity_ids = VALUES(entity.id) BY host.hostname
```

Then write the resolved `entity.id` values to `entity.relationships.administers.ids` on the actor entity.

---

## Kibana Bug Fixed During This Investigation

**File:** `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/generic.ts`

**Problem:** 8 numeric host fields were missing explicit `mapping` types in `newestValue()` calls. `newestValue` defaults to `{ type: 'keyword' }`, causing the entity index to map them as `keyword`. The extraction query computed them as `long`/`double` (via `TO_LONG`/`LAST`) then hit a `COALESCE` type mismatch at runtime:

```
verification_exception: second argument of [COALESCE(recent.host.cpu.usage, host.cpu.usage)]
must be [double], found value [host.cpu.usage] type [keyword]
```

**Fix:** Added explicit ECS-correct mappings:
- `host.cpu.usage` → `{ type: 'scaled_float', scaling_factor: 1000 }`
- `host.disk.read.bytes`, `host.disk.write.bytes`, `host.network.*.bytes`, `host.network.*.packets`, `host.uptime` → `{ type: 'long' }`

Snapshot updated. Entity store must be reinstalled for the mapping change to take effect.

---

## Open Questions

1. **Does the engine support reading from the entity index as Step 1 source?** The current engine uses composite aggs on log indices. For `administers`, actors are entity documents (not raw logs). Need to verify if the engine's actor discovery query builder handles entity indices, or if a new `kind` is needed.

2. **Should `administers` run on the same 1d cadence as `accesses`?** AD syncs typically run every few hours, so 1d is likely appropriate.

3. **Other integrations pending:** Okta, Entra ID, Jamf Pro also need to implement `administers` per [kibana#266374](https://github.com/elastic/kibana/issues/266374). AD is the first.

---

## Reference

- AD integration pipeline: `../integrations/packages/entityanalytics_ad/data_stream/entity/elasticsearch/ingest_pipeline/`
- AD integration PR: [elastic/integrations#18337](https://github.com/elastic/integrations/pull/18337)
- Entity schema: [`x-pack/solutions/security/plugins/entity_store/common/domain/definitions/entity.schema.yaml`](../../../../../../../../../../entity_store/common/domain/definitions/entity.schema.yaml)
- Common fields / extraction mapping: [`x-pack/solutions/security/plugins/entity_store/common/domain/definitions/common_fields.ts`](../../../../../../../../../../entity_store/common/domain/definitions/common_fields.ts)
- Engine implementation: [`engine/`](../engine/)
- Existing maintainers: [`accesses/`](../accesses/), [`communicates_with/`](../communicates_with/)
- Documents generator: [`../security-documents-generator/src/commands/org_data/integrations/active_directory_integration.ts`](../../../../../../../../../../../security-documents-generator/src/commands/org_data/integrations/active_directory_integration.ts)
- Investigation issue: [kibana#266374](https://github.com/elastic/kibana/issues/266374)
- Actor type issue: [kibana#266748](https://github.com/elastic/kibana/issues/266748)
- `depends_on` context (related design): [`../depends_on/CONTEXT.md`](../depends_on/CONTEXT.md)
- Domain knowledge: [`../AGENTS.md`](../AGENTS.md)
