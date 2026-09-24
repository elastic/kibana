/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'crypto';

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { ErrorWithStatusCode } from '../../error_with_status_code';
import { transformListItemToElasticQuery } from '../utils';

import { isRangeType } from './build_lookup_mappings';
import type { CoalescedBound } from './coalesce_ranges';
import {
  coalesceBounds,
  coalesceRangeValues,
  parseValueToBound,
  uncoveredBounds,
  widenForAdjacency,
} from './coalesce_ranges';
import { canonicalLookupValue, normalizeLookupValue } from './normalize_lookup_value';
import { collectHits } from './paginate_hits';

const hashId = (value: string): string => createHash('sha256').update(value).digest('hex');
const coalescedId = (bound: CoalescedBound): string =>
  hashId(`${bound.range_start}-${bound.range_end}`);

/**
 * The document id of an authored value: a hash of the list id and the value in its
 * normalized form (see `normalizeLookupValue`), prefixed with `src:` on a range list so
 * source documents never collide with coalesced or bookkeeping ids. This is also the
 * item id the public item API exposes for a lookup list. The list id is part of the
 * hash so the same value in two lists has two ids, and an operation by item id alone
 * can only ever reach the list the id was minted for.
 */
export const lookupItemId = (type: Type, value: string, listId: string): string => {
  const id = hashId(`${listId}\n${normalizeLookupValue(type, value)}`);
  return isRangeType(type) ? `src:${id}` : id;
};

/** The single rebuild bookkeeping doc per range lookup index. */
export const STATE_DOC_ID = '__state';

/**
 * Run a bulk request and raise its item failures, which the client does not raise on
 * its own. A malformed value fails at the mapper inside the bulk response, and a caller
 * without write on the index fails per item with 403; the shared stream's single-item
 * create surfaces both as errors, so this does too, with the item's own status.
 */
const bulkOrThrow = async (
  esClient: ElasticsearchClient,
  request: estypes.BulkRequest,
  ignoreErrors = false
): Promise<void> => {
  const response = await esClient.bulk(request);
  if (!response.errors) return;
  const failures = response.items
    .map((item) => item.index ?? item.create ?? item.update ?? item.delete)
    .filter((operation) => operation?.error != null);
  // `ignoreErrors` drops the items the mapper rejected, as the shared stream's import
  // does; a failure that is not about the item (no privilege on the index) still raises.
  const failure = ignoreErrors
    ? failures.find((operation) => operation?.status === 401 || operation?.status === 403)
    : failures[0];
  if (failure == null) return;
  const reason =
    failure.error?.caused_by?.reason ?? failure.error?.reason ?? 'bulk write to the list failed';
  throw new ErrorWithStatusCode(reason, failure.status ?? 400);
};

interface CoalesceState {
  source_version: number;
  coalesced_version: number;
  status: 'dirty' | 'clean';
}

interface Bounds {
  range_start: string;
  range_end: string;
}

/**
 * Bump the source version and mark the coalesced cache dirty. Called after every
 * source mutation (insert or delete) on a range list. A scripted upsert with
 * `retry_on_conflict` so two concurrent writers both record their increment. The
 * version is the completion guard for the rebuild task; the specific regions that
 * changed are recorded separately as dirty markers.
 */
const STATE_UPDATE_ATTEMPTS = 8;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const markCoalesceDirty = async (esClient: ElasticsearchClient, index: string): Promise<void> => {
  // Every writer to a range list touches this one document, so a burst of concurrent
  // writes contends on it. Elasticsearch retries the scripted update on conflict; a
  // burst larger than its retry budget still surfaces a 409, so the update is retried
  // here as well with a short random backoff, and only then fails the write.
  for (let attempt = 1; ; attempt++) {
    try {
      await esClient.update({
        id: STATE_DOC_ID,
        index,
        refresh: false,
        retry_on_conflict: 50,
        script: {
          lang: 'painless',
          source: `
            if (ctx.op == 'create') {
              ctx._source.source_version = 1;
              ctx._source.coalesced_version = 0;
            } else {
              ctx._source.source_version += 1;
            }
            ctx._source.kind = 'state';
            ctx._source.status = 'dirty';
          `,
        },
        scripted_upsert: true,
        upsert: {},
      });
      return;
    } catch (err) {
      const status = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (status !== 409 || attempt >= STATE_UPDATE_ATTEMPTS) throw err;
      await sleep(10 * attempt + Math.floor(Math.random() * 40 * attempt));
    }
  }
};

/**
 * Above this many windows in a single write, collapse them into one marker spanning
 * the whole batch: re-coalescing very many scattered regions is more expensive than
 * re-coalescing the one span they sit in.
 */
const DIRTY_WINDOW_CAP = 100;

/**
 * Cap the number of dirty markers a single write appends. `coalesceBounds` returns
 * intervals sorted ascending by start and disjoint, so the first start and the last
 * end span every window; above the cap we collapse to that single spanning window.
 * Every marker keeps bounds, so the rebuild task always re-coalesces a bounded region.
 */
const capWindows = (windows: Bounds[]): Bounds[] => {
  if (windows.length <= DIRTY_WINDOW_CAP) return windows;
  return [
    { range_end: windows[windows.length - 1].range_end, range_start: windows[0].range_start },
  ];
};

/**
 * Record the regions a write touched, so the rebuild task re-coalesces only those
 * regions instead of the whole list. Writers only ever append markers (each with its
 * own id, so concurrent appends never conflict); the single-writer task drains them.
 * Every marker carries bounds: a window to re-coalesce.
 */
const writeDirtyMarkers = async (
  esClient: ElasticsearchClient,
  index: string,
  windows: Bounds[]
): Promise<void> => {
  if (windows.length === 0) return;
  const operations = windows.flatMap((window) => [
    { index: { _id: `dirty:${randomUUID()}` } },
    { kind: 'dirty', ...window },
  ]);
  await bulkOrThrow(esClient, { index, operations, refresh: true });
};

/**
 * Serialize an authored equality/native value to the scalar stored in `value`.
 * Reuses the existing per-type transform (handles geo WKT etc.); everything else
 * is coerced by Elasticsearch on index.
 */
const serializeEqualityValue = (type: Type, value: string): unknown => {
  const serialized = transformListItemToElasticQuery({ type, value });
  if (serialized == null) return undefined;
  return Object.values(serialized)[0];
};

/**
 * Replace the coalesced documents in an affected window. Indexes the recomputed
 * bounds first, then deletes the pulled coalesced documents that are not part of
 * the result, so an interruption leaves a superset of intervals (an over match)
 * rather than a hole (a missed match).
 */
const replaceCoalescedWindow = async (
  esClient: ElasticsearchClient,
  index: string,
  result: CoalescedBound[],
  pulledIds: Set<string>
): Promise<void> => {
  const resultIds = new Set(result.map(coalescedId));

  if (result.length > 0) {
    const operations = result.flatMap((bound) => [
      { index: { _id: coalescedId(bound) } },
      { kind: 'coalesced', ...bound },
    ]);
    await bulkOrThrow(esClient, { index, operations, refresh: true });
  }

  const staleIds = [...pulledIds].filter((id) => !resultIds.has(id));
  if (staleIds.length > 0) {
    const operations = staleIds.map((id) => ({ delete: { _id: id } }));
    // A stale document already deleted by a concurrent run is not a failure.
    await bulkOrThrow(esClient, { index, operations, refresh: true }, true);
  }
};

/** A `bool` clause matching documents whose parsed bounds overlap `[start, end]`. */
const overlaps = (
  startField: string,
  endField: string,
  window: Bounds
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { range: { [startField]: { lte: window.range_end } } },
      { range: { [endField]: { gte: window.range_start } } },
    ],
  },
});

/**
 * Re-coalesce a single dirty window from the current sources. This is the
 * incremental unit of the rebuild: it reads only the coalesced intervals the window
 * overlaps and only the sources inside those intervals, re-derives their disjoint
 * form, and replaces just those documents. Cost is proportional to the intervals
 * near the edit, not the list size. Correct because the task is the single writer,
 * so the coalesced set is disjoint when it reads it, which keeps the affected region
 * closed: the sources of an overlapping coalesced interval all overlap that interval,
 * so pulling "sources overlapping the window or any overlapping coalesced interval"
 * captures the whole connected component. For the discrete types the search bounds are
 * widened by one representable step, so exactly adjacent intervals are pulled in and
 * merged too (adjacency coalescing), matching the merge rule in `coalesceBounds`.
 */
const processWindow = async (
  esClient: ElasticsearchClient,
  index: string,
  type: Type,
  window: Bounds
): Promise<void> => {
  const coalescedDocs = await collectHits<Bounds>({
    _source: ['range_end', 'range_start'],
    esClient,
    index,
    query: {
      bool: {
        filter: [
          { term: { kind: 'coalesced' } },
          overlaps('range_start', 'range_end', widenForAdjacency(type, window)),
        ],
      },
    },
  });
  const pulledIds = new Set(coalescedDocs.map((hit) => hit._id as string));

  const regions = [
    window,
    ...coalescedDocs
      .map((hit) => hit._source)
      .filter((s): s is Bounds => s?.range_start != null && s?.range_end != null),
  ];
  const sources = await collectHits<{ src_end: string; src_start: string }>({
    _source: ['src_end', 'src_start'],
    esClient,
    index,
    query: {
      bool: {
        filter: [{ term: { kind: 'source' } }],
        minimum_should_match: 1,
        should: regions.map((region) =>
          overlaps('src_start', 'src_end', widenForAdjacency(type, region))
        ),
      },
    },
  });

  const bounds = sources
    .map((hit) => hit._source)
    .filter(
      (s): s is { src_end: string; src_start: string } => s?.src_start != null && s?.src_end != null
    )
    .map((s) => ({ range_end: s.src_end, range_start: s.src_start }));

  const fragments = coalesceBounds(type, bounds);
  await replaceCoalescedWindow(esClient, index, fragments, pulledIds);
};

/**
 * Verify that every source in `window` (or in the whole list) lies inside some coalesced
 * interval, reading both sets back from Elasticsearch. The version guard alone proves the
 * task ran, not that its result is complete: a bound the coalescer computed wrongly, or a
 * source the window query missed, would otherwise be recorded as clean and the future
 * join would miss it. A failure throws, so the state stays dirty, the markers stay, and the
 * task fails visibly with the first uncovered source in its message.
 */
const verifyCoverage = async (
  esClient: ElasticsearchClient,
  index: string,
  type: Type,
  window?: Bounds
): Promise<void> => {
  const inWindow = (startField: string, endField: string): estypes.QueryDslQueryContainer[] =>
    window == null ? [] : [overlaps(startField, endField, window)];
  const [sources, coalesced] = await Promise.all([
    collectHits<{ src_end: string; src_start: string }>({
      _source: ['src_end', 'src_start'],
      esClient,
      index,
      query: {
        bool: { filter: [{ term: { kind: 'source' } }, ...inWindow('src_start', 'src_end')] },
      },
    }),
    collectHits<Bounds>({
      _source: ['range_end', 'range_start'],
      esClient,
      index,
      query: {
        bool: {
          filter: [{ term: { kind: 'coalesced' } }, ...inWindow('range_start', 'range_end')],
        },
      },
    }),
  ]);
  const intervals = coalesced
    .map((hit) => hit._source)
    .filter((s): s is Bounds => s?.range_start != null && s?.range_end != null);
  const sourceBounds = sources
    .map((hit) => hit._source)
    .filter(
      (s): s is { src_end: string; src_start: string } => s?.src_start != null && s?.src_end != null
    )
    .map((s) => ({ range_end: s.src_end, range_start: s.src_start }));
  const uncovered = uncoveredBounds(type, intervals, sourceBounds);
  if (uncovered.length > 0) {
    const [first] = uncovered;
    throw new Error(
      `coalesced set of ${index} does not cover ${uncovered.length} source(s); first: ${first.range_start}-${first.range_end}`
    );
  }
};

/**
 * Full recompute of the coalesced set from all sources. The repair path only: a dirty
 * state with no markers, which means markers were lost to an interruption between
 * draining them and recording the state clean.
 */
const rebuildCoalesced = async (
  esClient: ElasticsearchClient,
  index: string,
  type: Type
): Promise<void> => {
  const sources = await collectHits<{ value: string }>({
    _source: ['value'],
    esClient,
    index,
    query: { term: { kind: 'source' } },
  });
  const values = sources.map((hit) => hit._source?.value).filter((v): v is string => v != null);
  const coalesced = coalesceRangeValues(type, values);

  const existing = await collectHits<never>({
    _source: [],
    esClient,
    index,
    query: { term: { kind: 'coalesced' } },
  });
  const existingIds = new Set(existing.map((hit) => hit._id as string));
  await replaceCoalescedWindow(esClient, index, coalesced, existingIds);
};

/**
 * Reconcile the coalesced cache to the current sources. This is the body of the
 * background rebuild task, coordinated by Task Manager so only one runs per list, so
 * it is the single writer of coalesced documents and there is no write race to
 * resolve. It drains the dirty markers and re-coalesces only their regions, then
 * marks the state clean only if the source version has not moved (an optimistic
 * concurrency guard), so a write that landed during the run, which also appended a
 * marker, forces another run. Returns:
 * - "clean": the cache now matches the sources.
 * - "stale": a newer write landed during the run, so the caller should re-run.
 * - "noop": nothing was owed.
 */
export const reconcileCoalesced = async ({
  esClient,
  index,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
}): Promise<'clean' | 'stale' | 'noop'> => {
  const state = await esClient
    .get<CoalesceState>({ id: STATE_DOC_ID, index })
    .catch((err: { meta?: { statusCode?: number } }) => {
      // A missing state doc means no range write is owed; anything else (for example
      // the internal user lacking privileges on the per-list index) is a real error
      // that should surface and let the task retry, not be masked as "nothing to do".
      if (err?.meta?.statusCode === 404) return undefined;
      throw err;
    });
  if (state?._source == null) return 'noop';
  const { source_version: version, coalesced_version: coalescedVersion } = state._source;
  if (coalescedVersion >= version) return 'noop';

  const markers = await collectHits<Bounds>({
    _source: ['range_end', 'range_start'],
    esClient,
    index,
    query: { term: { kind: 'dirty' } },
  });
  const markerIds = markers.map((hit) => hit._id as string);
  const windows = markers
    .map((hit) => hit._source)
    .filter((s): s is Bounds => s?.range_start != null && s?.range_end != null);

  // Every marker carries bounds, so each is a region to re-coalesce. A dirty state
  // with no markers means the markers were lost to an interruption, so recompute the
  // whole list from its sources to repair it.
  if (markers.length === 0) {
    await rebuildCoalesced(esClient, index, type);
    await verifyCoverage(esClient, index, type);
  } else {
    for (const window of windows) {
      await processWindow(esClient, index, type, window);
    }
    for (const window of windows) {
      await verifyCoverage(esClient, index, type, widenForAdjacency(type, window));
    }
  }

  if (markerIds.length > 0) {
    await bulkOrThrow(
      esClient,
      { index, operations: markerIds.map((id) => ({ delete: { _id: id } })), refresh: true },
      true
    );
  }

  try {
    await esClient.update({
      doc: { coalesced_version: version, status: 'clean' },
      id: STATE_DOC_ID,
      if_primary_term: state._primary_term,
      if_seq_no: state._seq_no,
      index,
      refresh: false,
    });
  } catch {
    // A concurrent write bumped the version (and the seq_no), and appended its own
    // marker, while we ran. Leave the state dirty and let the caller re-run so the
    // new marker is drained.
    return 'stale';
  }

  // Post-clean re-check: a write can land after the clean update above but before
  // this task is freed, so its enqueue is a no-op. Read the version once more, and
  // count the markers: a writer indexes its marker before it bumps the version, so a
  // marker with no bump yet is also a pending write. Either asks the caller to run
  // again so the new marker is drained.
  const [after, pending] = await Promise.all([
    esClient.get<CoalesceState>({ id: STATE_DOC_ID, index }).catch(() => undefined),
    esClient.count({ index, query: { term: { kind: 'dirty' } } }).catch(() => undefined),
  ]);
  if (after?._source != null && after._source.coalesced_version < after._source.source_version) {
    return 'stale';
  }
  if ((pending?.count ?? 0) > 0) {
    return 'stale';
  }
  return 'clean';
};

/**
 * Writes authored values into a per-list lookup index.
 * - Equality / native types: one deduplicated doc per distinct value.
 * - Range types: one source doc per authored value (verbatim, plus parsed bounds),
 *   then a dirty-region marker. Writers never coalesce inline; the rebuild task does,
 *   which is what keeps concurrent edits to the same region from racing. A single add
 *   records its own window; a batch records its merged windows, collapsing to one
 *   spanning marker above the window cap.
 * A value the mapper rejects fails the write with the mapper's status, as the shared
 * stream's single create does. `ignoreErrors` keeps the shared stream's import behavior
 * instead: rejected lines are dropped and the rest are written.
 */
export const writeLookupItems = async ({
  esClient,
  index,
  listId,
  type,
  values,
  refresh = 'wait_for',
  ignoreErrors = false,
}: {
  esClient: ElasticsearchClient;
  index: string;
  listId: string;
  type: Type;
  values: string[];
  refresh?: estypes.Refresh;
  ignoreErrors?: boolean;
}): Promise<void> => {
  if (values.length === 0) return;

  if (isRangeType(type)) {
    const bounds: CoalescedBound[] = [];
    const operations = values.flatMap((value) => {
      const bound = parseValueToBound(type, value);
      if (bound == null) {
        // A source without bounds can never match and would break the inline exception
        // filter, which puts every authored value into the query. Reject it, or drop it
        // on import, as the shared stream's mapper does.
        if (ignoreErrors) return [];
        throw new ErrorWithStatusCode(
          `list item invalid: "${value.trim()}" is not a valid ${type} value`,
          400
        );
      }
      bounds.push(bound);
      const doc = {
        kind: 'source',
        src_end: bound.range_end,
        src_range: { gte: bound.range_start, lte: bound.range_end },
        src_start: bound.range_start,
        value,
      };
      // _id keyed on the authored value => idempotent source upsert
      return [{ index: { _id: lookupItemId(type, value, listId) } }, doc];
    });
    if (operations.length === 0) return;
    // the same refresh policy as an equality write, so a range write costs the caller
    // the same wait as on the shared stream
    await bulkOrThrow(esClient, { index, operations, refresh }, ignoreErrors);

    // Only parseable values contribute a bound; if none did, no interval changed and
    // no re-coalesce is owed.
    if (bounds.length > 0) {
      // Record the touched regions first, then bump the version. The task reads the
      // version before the markers, so a marker that is visible before its bump costs at
      // most one extra window, while a bump visible before its marker would let the task
      // record clean with the window unprocessed. Merge the batch's bounds first, so a
      // contiguous batch becomes a few windows rather than one per value, and a single
      // add is one window. Above the cap, collapse to one marker spanning the batch.
      await writeDirtyMarkers(esClient, index, capWindows(coalesceBounds(type, bounds)));
      await markCoalesceDirty(esClient, index);
    }
    return;
  }

  const operations = values.flatMap((value) => {
    // Only a spelling in the type's accepted grammar is written, so the document id
    // (a hash of the canonical spelling) can never merge two distinct stored values.
    const canonical = canonicalLookupValue(type, value);
    const serialized = canonical.ok ? serializeEqualityValue(type, value) : undefined;
    if (!canonical.ok || serialized === undefined) {
      if (ignoreErrors) return [];
      const reason = canonical.ok ? `"${value.trim()}" is not a valid ${type}` : canonical.reason;
      throw new ErrorWithStatusCode(`list item invalid: ${reason}`, 400);
    }
    // _id keyed on the canonical value => idempotent, deduplicated upsert
    return [{ index: { _id: lookupItemId(type, value, listId) } }, { value: serialized }];
  });
  if (operations.length === 0) return;
  await bulkOrThrow(esClient, { index, operations, refresh }, ignoreErrors);
};

/** Swallow a missing document on delete; any other failure (403, 5xx) is raised. */
const ignoreNotFound = (err: { meta?: { statusCode?: number } }): void => {
  if (err?.meta?.statusCode === 404) return;
  throw err;
};

/** Delete a single authored value from a lookup list. */
export const deleteLookupItemByValue = async ({
  esClient,
  index,
  listId,
  type,
  value,
  refresh = 'wait_for',
}: {
  esClient: ElasticsearchClient;
  index: string;
  listId: string;
  type: Type;
  value: string;
  refresh?: estypes.Refresh;
}): Promise<void> => {
  const id = lookupItemId(type, value, listId);
  if (isRangeType(type)) {
    await esClient.delete({ id, index, refresh }).catch(ignoreNotFound);
    // Only a parseable value contributed a bound; an unparseable one changed no
    // interval, so nothing is owed to the coalesced set. Marker before version bump, as
    // on insert.
    const bound = parseValueToBound(type, value);
    if (bound != null) {
      await writeDirtyMarkers(esClient, index, [bound]);
      await markCoalesceDirty(esClient, index);
    }
    return;
  }
  await esClient.delete({ id, index, refresh }).catch(ignoreNotFound);
};
