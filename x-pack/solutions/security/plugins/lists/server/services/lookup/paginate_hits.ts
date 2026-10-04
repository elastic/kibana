/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

const DEFAULT_BATCH_SIZE = 10000;

interface PaginateOptions {
  _source?: string[];
  batchSize?: number;
  esClient: ElasticsearchClient;
  index: string;
  query: estypes.QueryDslQueryContainer;
  /**
   * Sort key for `search_after`. Defaults to `_seq_no`, which is complete on a single
   * shard lookup index. A multi shard target such as the legacy `.items` data stream
   * must pass a key that is unique across shards, for example `tie_breaker_id`.
   */
  sort?: estypes.Sort;
}

/**
 * Pull based streaming read: yields one batch of hits at a time, paging with
 * `search_after` on `_seq_no` so a large result is never truncated at a single `size`,
 * and only one batch is held in memory at once. The caller drives the pace; a
 * `for await` that stops early stops the paging.
 *
 * No point in time is used, on purpose. A search that carries a point in time is
 * authorized against the concrete index encoded in it, so a credential that only holds
 * the list's alias (every role and rule API key under the `.items*` wildcard) is denied.
 * A plain search names the alias and is authorized on it. `_seq_no` is unique within a
 * shard, and a lookup index has one shard, so it is a complete sort key. A document
 * updated during the scan can appear again with its new sequence number, which the
 * callers tolerate: they dedupe by id or by value.
 */
export const paginateHits = async function* <T>({
  _source,
  batchSize = DEFAULT_BATCH_SIZE,
  esClient,
  index,
  query,
  sort = [{ _seq_no: 'asc' }],
}: PaginateOptions): AsyncGenerator<Array<estypes.SearchHit<T>>, void, void> {
  let searchAfter: estypes.SortResults | undefined;
  for (;;) {
    const page = await esClient.search<T>({
      _source,
      index,
      query,
      search_after: searchAfter,
      size: batchSize,
      sort,
      track_total_hits: false,
    });
    const batch = page.hits.hits;
    if (batch.length === 0) break;
    yield batch;
    if (batch.length < batchSize) break;
    searchAfter = batch[batch.length - 1].sort;
  }
};

/**
 * Collect every hit into one array. Use when the caller genuinely needs the whole
 * set at once (for example to sort it); prefer `paginateHits` when the work can be
 * done a batch at a time.
 */
export const collectHits = async <T>(
  options: PaginateOptions
): Promise<Array<estypes.SearchHit<T>>> => {
  const all: Array<estypes.SearchHit<T>> = [];
  for await (const batch of paginateHits<T>(options)) all.push(...batch);
  return all;
};

/**
 * Storage neutral streaming read of a list's authored values, one batch at a time.
 * `extract` turns a document `_source` into its authored value string, which is
 * the only part that differs between storage kinds: a lookup list reads `value`
 * (or the verbatim source `value` for ranges); a legacy list reads the per type
 * field and deserializes it. Both share the same paging.
 */
export const streamListValues = async function* <T>({
  _source,
  esClient,
  extract,
  index,
  query,
  sort,
}: {
  _source?: string[];
  esClient: ElasticsearchClient;
  extract: (source: T | undefined) => string | null | undefined;
  index: string;
  query: estypes.QueryDslQueryContainer;
  sort?: estypes.Sort;
}): AsyncGenerator<string[], void, void> {
  for await (const batch of paginateHits<T>({ _source, esClient, index, query, sort })) {
    const values: string[] = [];
    for (const hit of batch) {
      const value = extract(hit._source);
      if (value != null) values.push(value);
    }
    yield values;
  }
};
