# Value lists in lookup indices: POC

Proof of concept for the "migrate value lists to lookup indices" proposal
(`value_lists_lookup_indices_proposal.md` at the repo root). Value lists live in one
lookup-mode index per list, coexisting with legacy lists in the shared `.items-<space>`
data stream.

## Names and access

Each list has two names:

- Concrete index: `.value-list-v2-<spaceId>-<normalized list id>`.
- Alias: `.items-<spaceId>-<normalized list id>`. It sits under the `.items*` wildcard
  that existing roles and rule API key snapshots grant, so a shared list needs no role
  change.

The container document records both in `storage.locator`. Every read and write uses
`alias ?? index`. Restricting a list removes the alias, so only roles that grant the
concrete name can reach it. Normalization is lossy, so a create fails with 409 when
either name exists.

## Feature flag

`xpack.lists.enableLookupIndices` (default `false`). When on, every new value list is a
lookup list. Legacy lists stay legacy until migrated.

## Endpoints (internal, version 1)

- `POST /internal/lists/_migrate { id, restrict?, force? }`: copies a legacy list into
  its lookup index, non-destructively. Blocked with 409 when a referencing rule's key
  cannot read the alias or an indicator match rule reads the list through `.items`,
  unless `force`.
- `POST /internal/lists/_restrict { id, dryRun?, force? }`: verifies the caller can read
  the concrete index and lists the referencing rules, then sets the locator to the
  concrete index and drops the alias. `dryRun` changes nothing. A caller without read is
  blocked unless `force`.
- `POST /internal/lists/_unrestrict { id }`: adds the alias back and records it.

The referencing-rule scan is supplied by the security solution through
`registerValueListRuleScanner`. For restrict, the scanner also checks each referencing
rule's API key for read on the concrete index through
`rulesClient.getRuleApiKeyIndexPrivileges` (alerting), and a rule whose key cannot read
blocks the restrict unless `force`.

## Item ids

Lookup item ids are content addressed: `sha256(value)`, prefixed with `src:` on a range
list. `GET`, `PUT`, `PATCH`, and `DELETE /api/lists/items?id=` resolve the id across the
space's lookup indices; `PUT` and `PATCH` return the new id. `_find` pages with the same cursor and
`search_after` walk as the shared stream, with `_seq_no` as the tie breaker, and sorts
on `value`. Import without `list_id` creates a lookup list named after the file, as the
shared stream does.

## Storage layout

- Equality and native types: `{ value }`, `_id = sha256(value)`.
- Range types: `source` documents (authored value, `src_start`, `src_end`), derived
  disjoint `coalesced` documents (`range_start`, `range_end`), one `__state` document,
  and short-lived `dirty` markers. Writers never coalesce; the `lists:coalesce-rebuild`
  task does, one run per list.

## Files

- `get_lookup_index.ts`: normalization and the two names.
- `create_lookup_index.ts`: create with alias, fail on collision, add and remove alias.
- `storage.ts`: descriptor helpers (`lookupIndexOf`, `lookupAliasOf`, `lookupAccessNameOf`).
- `build_lookup_mappings.ts`, `coalesce_ranges.ts`, `write_lookup_items.ts`,
  `read_lookup_items.ts`, `membership_lookup_items.ts`, `import_lookup_items.ts`,
  `paginate_hits.ts`: storage, reads, writes, and coalescing.

## Verify

```
node scripts/jest x-pack/solutions/security/plugins/lists/server/services/lookup
node poc_value_list_verification.mjs
node poc_migration_test.mjs
node poc_restrict_test.mjs
node poc_adjacency_test.mjs
```

The coalesce task API key is kept in the hidden encrypted saved object
`lists-coalesce-rebuild-api-key`, one per list access name; the task params carry only
the index and type. Known POC limit: item `meta` is not stored on lookup lists.

## Design details moved from the proposal

The proposal at the repo root states the decisions. This section holds the mechanics.

### ListClient method groups

- Item methods resolve the list and dispatch by storage: `searchListItemByValues`,
  `getListItemByValues`, `getListItemByValue`, `getListItem`, `findListItem`,
  `findAllListItems`, `createListItem`, `updateListItem`, `patchListItem`,
  `deleteListItem`, `deleteListItemByValue`, `importListItemsToStream`,
  `exportListItemsToStream`.
- Container methods use the registry (`.lists-<space>`): `getList`, `findList`,
  `createList`, `createListIfItDoesNotExist`, `updateList`, `patchList`, `deleteList`.
  `createList` sets `storage` from the flag alone and provisions the index and alias with
  the internal client. `deleteList` deletes the concrete index.
- Infrastructure methods stay with the shared streams and remain while any legacy list
  exists: names, existence checks, bootstrap index, templates, policies, data stream
  migration.

Every ListClient is constructed per request, so a per instance memo of the resolved
list would be safe; the POC re-reads the container per call.

### Migration warning levels (indicator match through `.items`)

- `referenced`: rules read `.items-<space>` and their threat query names the `list_id`.
- `maybe`: rules read `.items-<space>` without naming the list.
- `unverified`: the scan failed; review rules that use `.items-<space>` by hand.
- `none`: nothing found.

Any level other than `none` blocks the migration unless the caller passes `force`. A scan error yields `unverified`, which also blocks, so a broken scan never lets a migration through silently.

### Range documents

```
kind:        keyword    # "source" | "coalesced" | "state" | "dirty"
value:       keyword    # authored string, verbatim      (source docs)
src_start:   <type>     # parsed lower bound             (source docs)
src_end:     <type>     # parsed upper bound             (source docs)
range_start: <type>     # disjoint lower bound           (coalesced docs)
range_end:   <type>     # disjoint upper bound           (coalesced docs)
```

Source `_id` is `src:sha256(value)`. Coalesced `_id` is a hash of the bounds. One
`__state` document (`kind: state`) carries `source_version`, `coalesced_version`, and
`status`. Each write appends a `kind: dirty` marker holding the bounds of the region it
touched; a batch merges its bounds into windows first and collapses to one spanning
marker above 100 windows.

### The three update operations

- Insert: index one source document per value, then a dirty marker per window.
- Delete: delete the source document by id, then a dirty marker for its bounds. A delete
  can fragment an interval into several when the removed range bridged others.
- Modify: a delete of the old value and an insert of the new one, each with its marker.

Worked example (insert): sources `1-100`, `50-200`, `500` coalesce to `1-200`, `500`.
Adding `150-300` and `1000-2000` yields `1-300`, `500`, `1000-2000`. Export still returns
all five authored strings.

Worked example (delete then insert): `A = 1-100`, `B = 90-300`, `C = 200-400` coalesce to
`1-400`. Deleting `B` fragments to `1-100`, `200-400`. Inserting `D = 95-250` re-merges to
`1-400`.

### The coalesce operation

For each dirty region: read the coalesced intervals the region overlaps, then read every
source overlapping the region or any of those intervals (two searches per region, paged),
sort by start, merge overlaps (and exact adjacency for the discrete types ip, integer,
long, date), then index the new coalesced documents before deleting the pulled ones that
are not in the result.

```
coalesce(list):
  markers = search(kind: dirty)
  regions = mergeOverlapping(markers)
  for region in regions: processRegion(list, region)
  delete(markers)
  markStateClean(list)                 # guarded by __state _seq_no

processRegion(list, region):
  covered = search(kind: coalesced where overlaps(region))
  sources = search(kind: source where overlaps(region) OR overlaps(any covered))
  merged  = sortByStart(sources).mergeOverlapping()
  replaceCoalesced(index = merged, deleteStale = covered.ids not in merged)
```

The expansion is closed because the coalesced set is disjoint before the run: every
source sits inside exactly one coalesced interval, so pulling the sources of the
intervals the region overlaps captures the whole connected run. A dirty state with no
markers (markers lost to an interruption) triggers a full rebuild from all sources.

### Write path and task

A write mutates the sources, bumps `source_version` and sets `status: dirty` on
`__state` in one scripted update with `retry_on_conflict`, appends its markers, and
enqueues the task. The task, one per list by deterministic id, reads `source_version`
as `V`, drains the markers, re-coalesces, deletes the drained markers, and records
`coalesced_version = V, status: clean` guarded by the `__state` `_seq_no`. A write that
lands during the run fails that guard and leaves a fresh marker, so the task runs again.
After recording clean, the task reads the version once more and reruns if a newer write
landed. A failed task is removed and rescheduled by the next write; a pending task in
retry backoff is asked to run now (`runSoon`).

Consistency: new coalesced documents are indexed before stale ones are deleted, so an
interruption leaves a superset of intervals. The retry re-reads the overlapping coalesced
documents, new and stale, and deletes the ones not in the recomputed result.

Open interleaving: a write that commits after the task recorded clean but before Task
Manager released the task is not re-coalesced until the next write, because its enqueue
is a no-op and the post-clean re-check already ran. Membership is unaffected (it reads
sources); only the coalesced projection lags. A low frequency sweep that queues a rebuild
for any list with `coalesced_version < source_version` would close it; not built.

### Task credential

The task authenticates with an API key granted on behalf of the writing user, scoped to
the list's access name, kept in the hidden encrypted saved object
`lists-coalesce-rebuild-api-key`. Once `kibana_system` holds `.value-list-*`, the task
can run as the internal user and this machinery can go.

### Elasticsearch change (reserved role)

Repository `elastic/elasticsearch`, directory
`x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/`:

- `ReservedRolesStore.java`: constant `VALUE_LIST_INDEX = ".value-list-*"`.
- `KibanaOwnedReservedRoleDescriptors.java`: add the constant to the value lists block of
  the `kibana_system` descriptor (privileges `all`).
- `ReservedRolesStoreTests.java`: add the pattern to the full access list in
  `testKibanaSystemRole`.

Not added to `viewer` or `editor`. Locally the change is emulated with a user holding
`kibana_system` plus a role granting `all` on `.value-list-*`.
