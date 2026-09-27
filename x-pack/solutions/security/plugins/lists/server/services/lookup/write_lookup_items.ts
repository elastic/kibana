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
  createStreamingCoalescer,
  parseValueToBound,
  uncoveredInStreams,
  widenForAdjacency,
} from './coalesce_ranges';
import { canonicalLookupValue, normalizeLookupValue } from './normalize_lookup_value';
import { collectHits, paginateHits } from './paginate_hits';

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
  // `ignoreErrors` drops the items the mapper rejected (a 400 on the item), as the shared
  // stream's import does; any other item failure is not about the value (no privilege on
  // the index, a rejected execution, an unavailable shard) and still raises, so an import
  // never reports success with values silently missing.
  const failure = ignoreErrors
    ? failures.find((operation) => operation?.status !== 400)
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

/** A parsed bound read back from a document, with the sequence number it was written at. */
interface StreamedBound extends CoalescedBound {
  seqNo: number;
}

/**
 * Stream the bounds of documents matching `query`, in ascending start order. Paging is
 * by `search_after` on the start field with `_seq_no` as the tie breaker, so a set of any
 * size is read one page at a time and never held whole.
 */
const streamBounds = async function* (
  esClient: ElasticsearchClient,
  index: string,
  query: estypes.QueryDslQueryContainer,
  startField: string,
  endField: string
): AsyncGenerator<StreamedBound, void, void> {
  for await (const page of paginateHits<Record<string, string>>({
    _source: [endField, startField],
    esClient,
    index,
    query,
    sort: [{ [startField]: 'asc' }, { _seq_no: 'asc' }],
  })) {
    for (const hit of page) {
      const rangeStart = hit._source?.[startField];
      const rangeEnd = hit._source?.[endField];
      if (rangeStart != null && rangeEnd != null) {
        yield { range_end: rangeEnd, range_start: rangeStart, seqNo: Number(hit.sort?.[1] ?? 0) };
      }
    }
  }
};

/** Drop the sequence number, for consumers that only need bounds. */
const boundsOnly = async function* (
  stream: AsyncIterable<StreamedBound>
): AsyncGenerator<CoalescedBound, void, void> {
  for await (const { range_end: rangeEnd, range_start: rangeStart } of stream) {
    yield { range_end: rangeEnd, range_start: rangeStart };
  }
};

/**
 * Coalesced documents per bulk request. Matches the read page (10,000 hits, the search
 * request limit), so a rebuild makes one round trip per 10,000 sources read and at most
 * one per 10,000 intervals written; a coalesced document is about 150 bytes, so a full
 * batch is about 1.5 MB, well inside the size Elasticsearch recommends for a bulk request.
 */
const COALESCED_WRITE_BATCH = 10000;

/**
 * Index coalesced intervals in batches as a coalescer produces them, tagged with the id
 * of the run that wrote them. Only a batch is ever held; `onWritten` sees every id.
 */
const coalescedWriter = (
  esClient: ElasticsearchClient,
  index: string,
  runId: string,
  onWritten?: (id: string) => void
): { add: (bounds: CoalescedBound[]) => Promise<void>; end: () => Promise<void> } => {
  let operations: unknown[] = [];
  const flush = async (): Promise<void> => {
    if (operations.length === 0) return;
    const batch = operations;
    operations = [];
    await bulkOrThrow(esClient, { index, operations: batch, refresh: true });
  };
  return {
    add: async (bounds: CoalescedBound[]): Promise<void> => {
      for (const bound of bounds) {
        const id = coalescedId(bound);
        onWritten?.(id);
        operations.push({ index: { _id: id } }, { built_by: runId, kind: 'coalesced', ...bound });
      }
      if (operations.length >= COALESCED_WRITE_BATCH * 2) await flush();
    },
    end: flush,
  };
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
 * Re-coalesce a single dirty window from the current sources. This is the incremental
 * unit of the rebuild: it reads the coalesced intervals the window overlaps (few: a
 * window touches one connected component and its neighbours), streams the sources inside
 * those intervals in start order through a coalescer, writes the result in batches, and
 * then deletes the pulled intervals the result did not reproduce. New intervals are
 * written before old ones are deleted, so an interruption leaves a superset (an over
 * match) rather than a hole (a missed match). Memory is one write batch plus the pulled
 * interval ids, whatever the size of the component. Correct because the task is the
 * single writer, so the coalesced set is disjoint when it reads it, which keeps the
 * affected region closed: the sources of an overlapping coalesced interval all overlap
 * that interval, so pulling "sources overlapping the window or any overlapping coalesced
 * interval" captures the whole connected component. For the discrete types the search
 * bounds are widened by one representable step, so exactly adjacent intervals are pulled
 * in and merged too (adjacency coalescing), matching the merge rule in `coalesceBounds`.
 */
const processWindow = async (
  esClient: ElasticsearchClient,
  index: string,
  type: Type,
  window: Bounds,
  runId: string
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
  // every pulled interval the result does not write again is stale
  const stale = new Set(coalescedDocs.map((hit) => hit._id as string));

  const regions = [
    window,
    ...coalescedDocs
      .map((hit) => hit._source)
      .filter((s): s is Bounds => s?.range_start != null && s?.range_end != null),
  ];
  const sources = streamBounds(
    esClient,
    index,
    {
      bool: {
        filter: [{ term: { kind: 'source' } }],
        minimum_should_match: 1,
        should: regions.map((region) =>
          overlaps('src_start', 'src_end', widenForAdjacency(type, region))
        ),
      },
    },
    'src_start',
    'src_end'
  );

  const coalescer = createStreamingCoalescer(type);
  const writer = coalescedWriter(esClient, index, runId, (id) => stale.delete(id));
  for await (const source of sources) {
    await writer.add(coalescer.push(source));
  }
  await writer.add(coalescer.flush());
  await writer.end();

  if (stale.size > 0) {
    const operations = [...stale].map((id) => ({ delete: { _id: id } }));
    // A stale document already deleted by a concurrent run is not a failure.
    await bulkOrThrow(esClient, { index, operations, refresh: true }, true);
  }
};

/**
 * The highest sequence number in the index right now. Every document written later
 * carries a larger one, so a reader that takes this mark before it starts can tell the
 * documents it was meant to see from those that arrived while it worked.
 */
const highestSeqNo = async (esClient: ElasticsearchClient, index: string): Promise<number> => {
  const response = await esClient.search({
    _source: false,
    index,
    size: 1,
    sort: [{ _seq_no: 'desc' }],
    track_total_hits: false,
  });
  return Number(response.hits.hits[0]?.sort?.[0] ?? -1);
};

/**
 * Verify that every source in `window` (or in the whole list) lies inside some coalesced
 * interval, reading both sets back from Elasticsearch as two streams sorted by start and
 * walking them together, so nothing is held beyond the current interval. The version
 * guard alone proves the task ran, not that its result is complete: a bound the coalescer
 * computed wrongly, or a source the window query missed, would otherwise be recorded as
 * clean and the future join would miss it. A failure throws, so the state stays dirty, the
 * markers stay, and the task fails visibly with the first uncovered source in its message.
 * A source written after the markers were drained (its sequence number is above the mark)
 * is owed to a later pass: its writer leaves a marker and bumps the version, so the guard
 * at the end of this run reports stale. Checking it here would fail the run for a value
 * that is not lost, only not yet processed.
 */
const verifyCoverage = async (
  esClient: ElasticsearchClient,
  index: string,
  type: Type,
  maxSeqNo: number,
  window?: Bounds
): Promise<void> => {
  const inWindow = (startField: string, endField: string): estypes.QueryDslQueryContainer[] =>
    window == null ? [] : [overlaps(startField, endField, window)];
  const sources = streamBounds(
    esClient,
    index,
    { bool: { filter: [{ term: { kind: 'source' } }, ...inWindow('src_start', 'src_end')] } },
    'src_start',
    'src_end'
  );
  const intervals = streamBounds(
    esClient,
    index,
    {
      bool: { filter: [{ term: { kind: 'coalesced' } }, ...inWindow('range_start', 'range_end')] },
    },
    'range_start',
    'range_end'
  );
  const seenBeforeDrain = async function* (): AsyncGenerator<CoalescedBound, void, void> {
    for await (const source of sources) {
      if (source.seqNo <= maxSeqNo) {
        yield { range_end: source.range_end, range_start: source.range_start };
      }
    }
  };
  const { count, first } = await uncoveredInStreams(type, seenBeforeDrain(), boundsOnly(intervals));
  if (count > 0 && first != null) {
    throw new Error(
      `coalesced set of ${index} does not cover ${count} source(s); first: ${first.range_start}-${first.range_end}`
    );
  }
};

/**
 * Full recompute of the coalesced set from all sources. The repair path only: a dirty
 * state with no markers, which means markers were lost to an interruption between
 * draining them and recording the state clean. The sources stream in start order through
 * a coalescer and the result is written in batches tagged with this run's id; the
 * intervals of earlier runs that the result did not write again are then removed in one
 * delete by query, after the new ones exist. Memory is one write batch, whatever the list
 * size.
 */
const rebuildCoalesced = async (
  esClient: ElasticsearchClient,
  index: string,
  type: Type,
  runId: string
): Promise<void> => {
  const sources = streamBounds(
    esClient,
    index,
    { term: { kind: 'source' } },
    'src_start',
    'src_end'
  );
  const coalescer = createStreamingCoalescer(type);
  const writer = coalescedWriter(esClient, index, runId);
  for await (const source of sources) {
    await writer.add(coalescer.push(source));
  }
  await writer.add(coalescer.flush());
  await writer.end();
  await esClient.deleteByQuery({
    conflicts: 'proceed',
    index,
    query: {
      bool: {
        filter: [{ term: { kind: 'coalesced' } }],
        must_not: [{ term: { built_by: runId } }],
      },
    },
    refresh: true,
  });
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
 * `shouldAbort` is read between steps; when it turns true the run stops and reports
 * "stale", leaving the markers and the dirty state for the next run.
 */
export const reconcileCoalesced = async ({
  esClient,
  index,
  type,
  shouldAbort = (): boolean => false,
  runId = randomUUID(),
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
  shouldAbort?: () => boolean;
  /** Tags the coalesced documents this run writes; a full rebuild removes every other tag. */
  runId?: string;
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
  // Everything written from here on belongs to a later pass: the coverage check below
  // ignores sources above this mark, since their writers leave a marker and bump the
  // version, and the guard at the end of this run reports stale for them.
  const maxSeqNo = await highestSeqNo(esClient, index);

  if (shouldAbort()) return 'stale';
  if (markers.length === 0) {
    await rebuildCoalesced(esClient, index, type, runId);
    await verifyCoverage(esClient, index, type, maxSeqNo);
  } else {
    for (const window of windows) {
      if (shouldAbort()) return 'stale';
      await processWindow(esClient, index, type, window, runId);
    }
    for (const window of windows) {
      if (shouldAbort()) return 'stale';
      await verifyCoverage(esClient, index, type, maxSeqNo, widenForAdjacency(type, window));
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
  user,
  values,
  now = new Date().toISOString(),
  refresh = 'wait_for',
  ignoreErrors = false,
}: {
  esClient: ElasticsearchClient;
  index: string;
  listId: string;
  type: Type;
  user: string;
  values: string[];
  now?: string;
  refresh?: estypes.Refresh;
  ignoreErrors?: boolean;
}): Promise<void> => {
  if (values.length === 0) return;

  // One document per value, so a repeated write is an update: the creation stamps are
  // set once by the upsert and the update stamps move on every write. The items table
  // sorts on them, as it does on the shared stream.
  const updated = { updated_at: now, updated_by: user };
  const created = { created_at: now, created_by: user, ...updated };
  const upsertOperation = (id: string, doc: Record<string, unknown>): unknown[] => [
    { update: { _id: id, retry_on_conflict: 3 } },
    { doc: { ...updated, ...doc }, upsert: { ...created, ...doc } },
  ];

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
      // _id keyed on the authored value => idempotent source upsert; the value is kept
      // trimmed, the spelling the id was hashed from
      return upsertOperation(lookupItemId(type, value, listId), {
        kind: 'source',
        src_end: bound.range_end,
        src_range: { gte: bound.range_start, lte: bound.range_end },
        src_start: bound.range_start,
        value: value.trim(),
      });
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
    return upsertOperation(lookupItemId(type, value, listId), { value: serialized });
  });
  if (operations.length === 0) return;
  await bulkOrThrow(esClient, { index, operations, refresh }, ignoreErrors);
};

/**
 * The values a write to a lookup list of `type` would refuse: a range the parser cannot
 * read, or a scalar outside the type's accepted grammar. The same checks the write
 * applies, so a caller can report them all before writing anything.
 */
export const rejectedLookupValues = (type: Type, values: string[]): string[] =>
  values.filter((value) =>
    isRangeType(type)
      ? parseValueToBound(type, value) == null
      : !canonicalLookupValue(type, value).ok || serializeEqualityValue(type, value) === undefined
  );

/** How many rejected values a scan keeps as a sample; the rest are only counted. */
export const REJECTED_SAMPLE_SIZE = 100;

/** A running count of rejected values with a bounded sample, so a scan uses flat memory. */
export interface RejectedValues {
  count: number;
  sample: string[];
}

/** Add a batch of rejected values to a running count, keeping the first sample only. */
export const recordRejected = (sofar: RejectedValues, rejected: string[]): RejectedValues => ({
  count: sofar.count + rejected.length,
  sample: [...sofar.sample, ...rejected.slice(0, REJECTED_SAMPLE_SIZE - sofar.sample.length)],
});

/** Swallow a missing document on delete; any other failure (403, 5xx) is raised. */
const ignoreNotFound = (err: { meta?: { statusCode?: number } }): void => {
  if (err?.meta?.statusCode === 404) return;
  throw err;
};

/** A document a delete by value removed: its id and the fields the item response is built from. */
export interface DeletedLookupItem {
  id: string;
  source: Record<string, unknown>;
}

const DELETED_ITEM_SOURCE = [
  'value',
  'src_start',
  'src_end',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
];

/**
 * Delete by value, with the current implementation's meaning of "value". On an equality
 * list the value names one document. On a range list the current implementation looks
 * for every stored range that CONTAINS the value with a `term` on the range field, so
 * this does the same on `src_range`: `10.0.0.5` removes every range holding that
 * address. (The current implementation then rebuilds its delete query from the range
 * strings it found, which the same `term` rejects, so it returns 400 whenever a range
 * matches; this carries the intended meaning through and returns the removed ranges.)
 * A range string such as `10.0.0.0/24` or `1-10` is not a value a range field can be
 * queried by, and Elasticsearch rejects it; the current implementation returns that
 * error to the caller, and so does this, on purpose, rather than deleting the authored
 * range by its id, so both storages answer that request the same way. The by-id paths
 * use `deleteAuthoredLookupItem` instead.
 * @returns The documents removed, empty when the value was not in the list
 */
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
}): Promise<DeletedLookupItem[]> => {
  if (isRangeType(type)) {
    const query: estypes.QueryDslQueryContainer = {
      bool: { filter: [{ term: { kind: 'source' } }, { term: { src_range: value } }] },
    };
    const found = await esClient.search<Record<string, unknown>>({
      _source: DELETED_ITEM_SOURCE,
      index,
      query,
      size: 10000,
    });
    const hits = found.hits.hits.filter((hit) => hit._source != null);
    if (hits.length === 0) return [];
    // the same two steps as the shared stream: find, then delete by the same query
    await esClient.deleteByQuery({
      conflicts: 'proceed',
      index,
      query,
      refresh: refresh !== false,
    });
    // Every removed source contributed a bound, so its region owes a re-coalesce. Marker
    // before version bump, as on insert.
    const bounds = hits
      .map((hit) => hit._source as { src_end?: string; src_start?: string })
      .filter(
        (s): s is { src_end: string; src_start: string } => s.src_start != null && s.src_end != null
      )
      .map((s) => ({ range_end: s.src_end, range_start: s.src_start }));
    await writeDirtyMarkers(esClient, index, capWindows(coalesceBounds(type, bounds)));
    await markCoalesceDirty(esClient, index);
    return hits.map((hit) => ({ id: hit._id as string, source: hit._source ?? {} }));
  }

  return deleteAuthoredLookupItem({ esClient, index, listId, refresh, type, value });
};

/**
 * Delete exactly the document one authored value names, whatever the type. The by-id
 * paths need this: an item id resolves to its authored value, and on a range list that
 * value is a range string, which is a document to remove, not an address to search
 * for. A removed range owes its region a re-coalesce, marker before version bump, as
 * on insert.
 * @returns The document removed, empty when the value was not in the list
 */
export const deleteAuthoredLookupItem = async ({
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
}): Promise<DeletedLookupItem[]> => {
  const id = lookupItemId(type, value, listId);
  const existing = await esClient
    .get<Record<string, unknown>>({ _source: DELETED_ITEM_SOURCE, id, index })
    .catch((err: { meta?: { statusCode?: number } }) => {
      if (err?.meta?.statusCode === 404) return undefined;
      throw err;
    });
  if (existing == null) return [];
  await esClient.delete({ id, index, refresh }).catch(ignoreNotFound);
  if (isRangeType(type)) {
    // Only a parseable value contributed a bound; an unparseable one changed no interval.
    const bound = parseValueToBound(type, value);
    if (bound != null) {
      await writeDirtyMarkers(esClient, index, [bound]);
      await markCoalesceDirty(esClient, index);
    }
  }
  return [{ id, source: existing._source ?? {} }];
};
