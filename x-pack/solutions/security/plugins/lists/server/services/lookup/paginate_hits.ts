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
}

/**
 * Pull based streaming read: yields one batch of hits at a time, paging with a
 * point in time and `search_after` so a large result is never truncated at a
 * single `size`, and only one batch is held in memory at once. The caller drives
 * the pace; a `for await` that stops early stops the paging. The point in time
 * pins a consistent snapshot for the whole scan, so callers should refresh before
 * reading if they need to see their own writes.
 */
export const paginateHits = async function* <T>({
  _source,
  batchSize = DEFAULT_BATCH_SIZE,
  esClient,
  index,
  query,
}: PaginateOptions): AsyncGenerator<Array<estypes.SearchHit<T>>, void, void> {
  const pit = await esClient.openPointInTime({ index, keep_alive: '1m' });
  try {
    let searchAfter: estypes.SortResults | undefined;
    for (;;) {
      const page = await esClient.search<T>({
        _source,
        pit: { id: pit.id, keep_alive: '1m' },
        query,
        search_after: searchAfter,
        size: batchSize,
        sort: [{ _shard_doc: 'asc' }],
        track_total_hits: false,
      });
      const batch = page.hits.hits;
      if (batch.length === 0) break;
      yield batch;
      if (batch.length < batchSize) break;
      searchAfter = batch[batch.length - 1].sort;
    }
  } finally {
    await esClient.closePointInTime({ id: pit.id });
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
}: {
  _source?: string[];
  esClient: ElasticsearchClient;
  extract: (source: T | undefined) => string | null | undefined;
  index: string;
  query: estypes.QueryDslQueryContainer;
}): AsyncGenerator<string[], void, void> {
  for await (const batch of paginateHits<T>({ _source, esClient, index, query })) {
    const values: string[] = [];
    for (const hit of batch) {
      const value = extract(hit._source);
      if (value != null) values.push(value);
    }
    yield values;
  }
};
