# Value lists in lookup indices: POC

Proof of concept for the "migrate value lists to lookup indices" proposal (`value_lists_lookup_indices_proposal.md` at the repo root). Value lists live in one lookup-mode index per list, coexisting with legacy lists in the shared `.items-<space>` data stream.

## Names and access

Each list has two names:

- Concrete index: `.value-list-v2-<spaceId>-<normalized list id>`.
- Alias: `.items-<spaceId>-<normalized list id>`. It sits under the `.items*` wildcard that existing roles and rule API key snapshots grant, so a shared list needs no role change.

The container document records both in `storage.locator`. Every read and write uses `alias ?? index`. Restricting a list removes the alias, so only roles that grant the concrete name can reach it. Normalization is lossy, so a create fails with 409 when either name exists, including the loser of two concurrent creates. An id longer than about 230 characters fails, because the concrete index name is limited to 255 bytes.

## Feature flag

`xpack.lists.enableLookupIndices` (default `false`). When on, every new value list is a lookup list. Legacy lists stay legacy until migrated.

## Endpoints (internal, version 1)

- `POST /internal/lists/_migrate { id, restrict?, force? }`: copies a legacy list into its lookup index, non-destructively. Blocked with 409 when a referencing rule's key cannot read the alias or an indicator match rule reads the list through `.items`, unless `force`. A rule that references the list through an exception and whose key can read the alias is reported in the response and blocks nothing.
- `POST /internal/lists/_restrict { id, dryRun?, force? }`: verifies the caller can read the concrete index and lists the referencing rules, then sets the locator to the concrete index and drops the alias. `dryRun` changes nothing. A caller without read is blocked unless `force`.
- `POST /internal/lists/_unrestrict { id }`: adds the alias back and records it.

The referencing-rule scan is supplied by the security solution through `registerValueListRuleScanner`. For restrict, the scanner also checks each referencing rule's API key for read on the concrete index through `rulesClient.getRuleApiKeyIndexPrivileges` (alerting), and a rule whose key cannot read blocks the restrict unless `force`.

## Indicator match rules

An indicator match rule can read a lookup list as a threat index: the concrete index, with the threat mapping on `value`. Before a run the executor checks every threat index for the rule's timestamp field and reports a partial failure when one lacks it. Lookup indices carry no timestamp on purpose, so the lists plugin exposes `isValueListLookupIndex(indexName)` on its setup contract (true for `.value-list-v2-*` while the flag is on) and the executor skips that check for those indices (`run_execution_validation.ts`, `hasTimestampFields`). Everything else about the rule is unchanged.

## Item ids

Lookup item ids are content addressed: `sha256(list id + value)`, prefixed with `src:` on a range list. The list id is part of the hash, so the same value in two lists has two ids and an operation by item id alone can only reach the list the id was minted for. The value is hashed in the canonical form of its type (`normalize_lookup_value.ts`, `canonicalLookupValue`): the spelling Elasticsearch stores, so `::1` and `0:0:0:0:0:0:0:1` on an `ip` list, or `1` and `1.0` on a `long` list, share one document and the id agrees with the query. The stored `value` keeps the spelling of the last write. Each type accepts a fixed grammar and the write rejects everything else with 400 (`list item invalid: ...`), so the id can never merge two values Elasticsearch keeps apart or split one it merges; the accepted set is narrower than what Elasticsearch itself would coerce. Rejected on purpose: IPv6 zone ids and any dotted IPv6 form other than `::ffff:a.b.c.d`, IPv4 with leading zeros or fewer than four octets, integers with a non-zero fraction (Elasticsearch drops it, and the smaller types round through a double first), uppercase booleans, dates with zone names, week or ordinal dates, a space separator, offsets beyond 18 hours, or digit strings shorter than 11, and any scalar with a line break (the shared stream stores it truncated). Floating point text is rounded to float or double with exact integer arithmetic (`parseDecimalExact`), because a double round trip is off by one float unit on some inputs; negative zero keeps its sign. Range endpoints go through the same grammars, with integer endpoints kept as `BigInt`. The proposal holds the table of accepted spellings and canonical forms. Import drops rejected lines and keeps the rest, as the shared stream's import does, and reports no count of dropped lines; a failure that is not about a line (no privilege on the index) still fails the import. Membership checks (`searchListItemByValues`, the post-filter path for large lists) return the same shape as the shared stream: one entry per event value, the value untouched, and the matched items. The clauses are the shared stream's: one `terms` (or `term`) per event value on the typed field, named `${value}.0`, so an array field costs one clause; range lists query `src_range`, a range field that a `terms` query matches by containment, exactly as the shared stream queries its range column; `text` uses one `match` per element. `matched_queries` decides membership, so Elasticsearch compares under the field type and the stored spelling never enters the comparison. `poc_exception_parity_test.mjs` runs the same exception rules on a legacy and a lookup list, `ip` and `ip_range`, small (inline path) and large (post-filter path), and requires identical alerts; two of its cells use a list id with capitals and a space, and check that the list and its items read back under the authored id while the storage locator holds the normalized index and alias names. `GET`, `PUT`, `PATCH`, and `DELETE /api/lists/items?id=` resolve the id across the space's lookup indices; `PUT` and `PATCH` return the new id. `_find` pages with the same cursor and `search_after` walk as the shared stream, with `_seq_no` as the tie breaker, and sorts on `value`. Import without `list_id` creates a lookup list named after the file, as the shared stream does.

## Storage layout

- Equality and native types: `{ value }`, `_id = sha256(list id + canonical value)`. Lookup documents carry no `@timestamp`: a list is not time series data, and a later ES|QL indicator match rule must read the whole list regardless of the time window. The rule executor's timestamp check therefore skips value list lookup indices (see "Indicator match rules" below).
- Range types: `source` documents (authored value, `src_start`, `src_end`, and the same bounds as the range field `src_range` for the membership query), derived disjoint `coalesced` documents (`range_start`, `range_end`), one `__state` document, and short-lived `dirty` markers. Writers never coalesce; the `lists:coalesce-rebuild` task does, one run per list access name. A range index created before `src_range` existed is brought up to date on its first read or write in a process (`upgrade_lookup_index.ts`: put mapping, then fill the field from `src_start` and `src_end`), because the mapping is strict and the membership query reads the field.

## Files

- `get_lookup_index.ts`: normalization and the two names.
- `create_lookup_index.ts`, `delete_lookup_index.ts`: create with alias, fail on collision, add and remove alias, delete.
- `storage.ts`: descriptor helpers (`lookupIndexOf`, `lookupAliasOf`, `lookupAccessNameOf`).
- `normalize_lookup_value.ts`: the form of a value that its document id hashes.
- `item_crud.ts`: item lookup by id across the space's lookup indices and cursor paging for `_find`.
- `build_lookup_mappings.ts`, `coalesce_ranges.ts`, `write_lookup_items.ts`, `read_lookup_items.ts`, `membership_lookup_items.ts`, `import_lookup_items.ts`, `paginate_hits.ts`: storage, reads, writes, and coalescing.
- `__tests__/`: Jest suites for the write path and coalescing.

## Verify

```
node scripts/jest x-pack/solutions/security/plugins/lists/server/services/lookup
node poc_value_list_verification.mjs
node poc_migration_test.mjs
node poc_restrict_test.mjs
node poc_items_crud_test.mjs
node poc_adjacency_test.mjs
node poc_exception_parity_test.mjs
node poc_indicator_match_parity_test.mjs
node poc_performance_test.mjs
```

`poc_performance_test.mjs` compares the response times of the list and item endpoints on both storages; its results and their reading are in `value_lists_lookup_indices_performance.md` at the repo root. Run it alone.

`poc_indicator_match_parity_test.mjs` runs twin indicator match rules over the same events, one reading a legacy list through `.items-<space>` with a `list_id` filter and one reading the lookup list's concrete index, and requires equal alerts; it then migrates a legacy list under a rule, points a second rule at the concrete index, and shows an edit after migration reaching the lookup rule only.

The coalesce task runs as the Kibana system user; its params carry only the index and type. Known POC limit: item `meta` is not stored on lookup lists.

## Design details moved from the proposal

The proposal at the repo root states the decisions. This section holds the mechanics.

### ListClient method groups

- Item methods resolve the list and dispatch by storage: `searchListItemByValues`, `getListItemByValues`, `getListItemByValue`, `getListItem`, `findListItem`, `findAllListItems`, `createListItem`, `updateListItem`, `patchListItem`, `deleteListItem`, `deleteListItemByValue`, `importListItemsToStream`, `exportListItemsToStream`.
- Container methods use the registry (`.lists-<space>`): `getList`, `findList`, `createList`, `createListIfItDoesNotExist`, `updateList`, `patchList`, `deleteList`. `createList` sets `storage` from the flag alone and provisions the index and alias with the internal client. `deleteList` deletes the concrete index. Both the route context and the setup contract build the ListClient with the internal client for provisioning; a ListClient from the setup contract (rule executors) schedules the coalesce rebuild like any other, since the task runs as the Kibana system user and needs no request.
- Infrastructure methods stay with the shared streams and remain while any legacy list exists: names, existence checks, bootstrap index, templates, policies, data stream migration.

Every ListClient is constructed per request, so a per instance memo of the resolved list would be safe; the POC re-reads the container per call.

### Migration warning levels (indicator match through `.items`)

- `referenced`: indicator match rules read `.items-<space>` and their threat query names the `list_id`, or they read the list's alias or concrete index directly.
- `maybe`: indicator match rules read `.items-<space>` without naming the list.
- `unverified`: the scan failed; review rules that use `.items-<space>` by hand.
- `none`: no indicator match rule found.

The level is decided by indicator match rules alone. Rules that reference the list through an exception item appear in `rules` with `reason: exception` and never set the level; on migration they block only when their API key cannot read the alias. `referenced` blocks the migration unless the caller passes `force`. `maybe` is a warning in the response and never blocks: every indicator match rule that reads `.items-<space>` is a `maybe` for every list in the space, so blocking on it would block every migration and train callers to pass `force`, which also disables the key check. A scan error yields `unverified`, which blocks, so a broken scan never lets a migration through silently.

### Range documents

```
kind:        keyword    # "source" | "coalesced" | "state" | "dirty"
value:       keyword    # authored string, verbatim      (source docs)
src_start:   <type>     # parsed lower bound             (source docs)
src_end:     <type>     # parsed upper bound             (source docs)
range_start: <type>     # disjoint lower bound           (coalesced docs)
range_end:   <type>     # disjoint upper bound           (coalesced docs)
```

Source `_id` is `src:sha256(list id + value)`. Coalesced `_id` is a hash of the bounds. One `__state` document (`kind: state`) carries `source_version`, `coalesced_version`, and `status`. Each write appends a `kind: dirty` marker holding the bounds of the region it touched; a batch merges its bounds into windows first and collapses to one spanning marker above 100 windows.

### The three update operations

- Insert: index one source document per value, then a dirty marker per window.
- Delete: delete the source document by id, then a dirty marker for its bounds. A delete can fragment an interval into several when the removed range bridged others.
- Modify: a delete of the old value and an insert of the new one, each with its marker.

Worked example (insert): sources `1-100`, `50-200`, `500` coalesce to `1-200`, `500`. Adding `150-300` and `1000-2000` yields `1-300`, `500`, `1000-2000`. Export still returns all five authored strings.

Worked example (delete then insert): `A = 1-100`, `B = 90-300`, `C = 200-400` coalesce to `1-400`. Deleting `B` fragments to `1-100`, `200-400`. Inserting `D = 95-250` re-merges to `1-400`.

### The coalesce operation

For each dirty region: read the coalesced intervals the region overlaps, then read every source overlapping the region or any of those intervals (two searches per region, paged), sort by start, merge overlaps (and exact adjacency for the discrete types ip, integer, long, date), then index the new coalesced documents before deleting the pulled ones that are not in the result.

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

The expansion is closed because the coalesced set is disjoint before the run: every source sits inside exactly one coalesced interval, so pulling the sources of the intervals the region overlaps captures the whole connected run. A dirty state with no markers (markers lost to an interruption) triggers a full rebuild from all sources.

### Write path and task

A write mutates the sources, appends its markers, then bumps `source_version` and sets `status: dirty` on `__state` in one scripted update with `retry_on_conflict` (retried a few times with jitter when a burst of writers exhausts it), and enqueues the task. The marker goes before the bump on purpose: the task reads the version before the markers, so a marker visible before its bump costs at most one extra window, while a bump visible before its marker would let the task record clean with the window unprocessed. The task, one per list access name by deterministic id, reads `source_version` as `V`, drains the markers, re-coalesces, verifies coverage, deletes the drained markers, and records `coalesced_version = V, status: clean` guarded by the `__state` `_seq_no`. The coverage check reads the sources and the coalesced documents of each window back from Elasticsearch and requires every source to lie inside some coalesced interval; a source outside fails the task with the first uncovered source in the message, so the state stays dirty and the markers stay, because the version guard alone proves the task ran, not that its result is complete. Bounds are computed on the number line Elasticsearch uses (IPv4 at the IPv4-mapped position) and a widened window is clamped to the type's extremes, so a range at the top of its space never yields a wrapped or out-of-range bound. A write that lands during the run fails that guard and leaves a fresh marker, so the task runs again. After recording clean, the task reads the version once more and counts the markers, and reruns at once if a newer write landed or a marker is pending; a run repeats up to ten passes before handing a still stale list to Task Manager's retry with backoff. A failed task is removed and rescheduled by the next write; a pending task in retry backoff is asked to run now (`runSoon`). A write that arrives while the task is running cannot enqueue a run (the task document still exists and `runSoon` is refused), so the scheduler retries the enqueue a few seconds later, after the finished task is gone.

Consistency: new coalesced documents are indexed before stale ones are deleted, so an interruption leaves a superset of intervals. The retry re-reads the overlapping coalesced documents, new and stale, and deletes the ones not in the recomputed result.

The remaining timing window is narrow: a write that commits after the post-clean re-check but before Task Manager releases the task relies on the scheduler's delayed re-enqueue (three retries, three seconds apart). A write that lands after those retries and while the task is still finishing waits for the next write to the list. Membership is unaffected (it reads sources); only the coalesced projection lags. A low frequency sweep that queues a rebuild for any list with `coalesced_version < source_version` or a pending marker would close it; not built.

### Task credential

The task runs as the Kibana system user, which provisions the per-list indices and holds `.value-list-*` in its reserved role (the Elasticsearch change below). No credential is granted or stored per write, a run never fails because a credential expired, and a ListClient built without a request (the setup contract, used by rule executors) can schedule the rebuild like any other. An earlier revision granted a one hour API key on behalf of the writing user on every write and kept it in an encrypted saved object; that path is gone.

### Elasticsearch change (reserved role)

Repository `elastic/elasticsearch`, directory `x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/`:

- `ReservedRolesStore.java`: constant `VALUE_LIST_INDEX = ".value-list-*"`.
- `KibanaOwnedReservedRoleDescriptors.java`: add the constant to the value lists block of the `kibana_system` descriptor (privileges `all`).
- `ReservedRolesStoreTests.java`: add the pattern to the full access list in `testKibanaSystemRole`.

Not added to `viewer` or `editor`. Locally the change is emulated with a user holding `kibana_system` plus a role granting `all` on `.value-list-*`.
