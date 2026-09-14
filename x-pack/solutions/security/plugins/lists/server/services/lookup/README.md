# Value lists in lookup indices: POC

Proof of concept for the "migrate value lists to lookup indices" proposal. Proves value
lists in per-list lookup indices work in **rule exceptions** and **indicator-match
rules**, coexisting with legacy (shared data stream) lists. The migration action, bulk
import wiring, and paginated find are out of scope.

Verified end to end by `poc_value_list_verification.mjs` (repo root): query rules whose
exceptions whitelist on a legacy ip list, a lookup ip list, and a lookup ip_range list;
IM rules using each storage as the threat index; plus a range import -> modify -> export
flow that shows the coalesced projection fragmenting (on delete of a bridge range) and
re-merging (on add), while the authored source values round-trip verbatim. All pass.

## Exception and IM execution

- Exceptions read list values through `ListClient.findAllListItems` (inline) and
  `searchListItemByValues` (post-filter); both are routed to the lookup index.
- Indicator match needs no code change on this branch: the threat search already sorts
  unconditionally by `_shard_doc` (PIT), so a rule can point `threat_index` at a per-list
  lookup index and map the field to `value`. (It logs a `@timestamp`-missing partial
  warning but still produces alerts.)
- `__forceLegacy` meta flag on `createList` is a test affordance to create a legacy list
  even with the flag on, so coexistence can be exercised without a config toggle.

## Decisions baked in

- **Feature flag**: `xpack.lists.enableLookupIndices` (default `false`). When on, **every
  new value list** is created in its own lookup-mode index (not a per-request choice).
- **All 23 element types** are storable. Equality/native types use a single typed `value`
  column; the six range types (`ip_range`, `date_range`, and the numeric ranges) use the
  source + coalesced layout.
- **One POC shortcut**: the per-list storage descriptor is carried in the container
  `meta` (which is `enabled: false`, so no mapping change). The proposal uses a dedicated
  `storage` field on `.lists-<space>`. Absence of the descriptor reads as a legacy
  data-stream list, so coexistence and no-op upgrade both hold.

## What each list looks like

- Index name: `.value-list-<spaceId>-<listId>` (single-shard lookup mode).
- Equality/native list: docs `{ value: <serialized> }`, `_id = sha256(value)` (dedup).
- Range list: `source` docs `{ kind: "source", value: <authored, verbatim>, src_start,
  src_end }` for export/find/delete (the parsed `src_*` bounds let a source be
  range-queried by the localized paths), plus derived `coalesced` docs `{ kind:
  "coalesced", range_start, range_end }` (disjoint) as the join target.

## Files

- `get_lookup_index.ts` — deterministic index naming.
- `build_lookup_mappings.ts` — per-type mappings.
- `coalesce_ranges.ts` — range parse + overlap coalescing (unit tested).
- `create_lookup_index.ts` / `delete_lookup_index.ts` — provision / drop.
- `write_lookup_items.ts` — dedup (equality) / source write + coalesced update / value
  delete. A single-value add updates only the affected coalesced window (localized insert);
  a delete re-coalesces only the sources inside the interval it fragments (localized
  delete); a batch import rebuilds the whole coalesced projection once. New coalesced docs
  are written before stale ones are removed, so an interruption over-matches, never misses.
- `paginate_hits.ts` — shared PIT + `search_after` paging: `paginateHits` (async generator,
  yields one batch, pull based, only one batch in memory) and `collectHits` (paged, collects
  all when the caller needs the whole set, e.g. the coalesce rebuild). All reads go through
  this, so nothing is truncated at a single `size`.
- `read_lookup_items.ts` — read + export authored values (source docs for ranges).
  `streamLookupItemValues` streams values a batch at a time (export uses it, so a large list
  is never fully buffered); `readLookupItemValues` collects all for callers that need it.
- `import_lookup_items.ts` — import a value file (dedup for equality, source + coalesced for ranges).
- `membership_lookup_items.ts` — exception reads (inline findAll + post-filter searchByValues).
- `storage.ts` — the storage descriptor helpers.

`ListClient` routes `createList`, `createListItem`, `exportListItemsToStream`,
`deleteList`, and `deleteListItemByValue` by the resolved descriptor.

## Verify

Unit test (coalescing):

```
node scripts/jest x-pack/solutions/security/plugins/lists/server/services/lookup/coalesce_ranges.test.ts
```

End to end (needs a Kibana with the flag on):

```
# kibana.dev.yml
xpack.lists.enableLookupIndices: true
```

```
POST /api/lists/index                                  # bootstrap the shared streams (registry)
POST /api/lists       { "id":"ips", "type":"ip", "name":"ips" }
POST /api/lists/items { "list_id":"ips", "value":"10.0.0.1" }
POST /api/lists/items { "list_id":"ips", "value":"10.0.0.1" }   # deduped
GET  .value-list-default-ips/_search                   # one doc
POST /api/lists/items/_export?list_id=ips              # returns the authored values
```
