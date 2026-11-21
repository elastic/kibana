/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient, estypes } from '@elastic/elasticsearch';

const PIT_KEEP_ALIVE = '2m';

/**
 * Every doc `_id` in the time window, paged via search_after inside a
 * point-in-time (PIT).
 */
export const listWindowIds = (
  esClient: EsClient,
  index: string,
  window: { start: string; end: string }
): Promise<string[]> =>
  listIdsInPit(esClient, index, {
    range: { '@timestamp': { gte: window.start, lt: window.end } },
  });

/**
 * Every doc `_id` matching `query`, paged via search_after inside a PIT.
 *
 * The PIT is required: `_shard_doc` — the only safe paging sort here — is only
 * accepted inside a PIT search, and sorting on `_id` is rejected outright on
 * ES 8+ ("Fielddata access on the _id field is disallowed",
 * `indices.id_field_data.enabled: false`).
 */
export const listIdsInPit = async (
  esClient: EsClient,
  index: string,
  query?: estypes.QueryDslQueryContainer
): Promise<string[]> => {
  const ids: string[] = [];
  // ES may return a new PIT id on any search (the final empty page included); the next
  // page and the close must use the latest one.
  let { id: pitId } = await esClient.openPointInTime({ index, keep_alive: PIT_KEEP_ALIVE });
  try {
    let searchAfter: string[] | undefined;
    for (;;) {
      const response = await esClient.search<{ _id: string; sort: string[] }>({
        pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
        size: 1000,
        sort: ['_shard_doc'],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        ...(query ? { query } : {}),
      });
      if (response.pit_id) pitId = response.pit_id;
      const hits = response.hits?.hits ?? [];
      if (hits.length === 0) break;
      const last = hits[hits.length - 1];
      // Guard against a page that does not advance (bad sort payload): stop instead
      // of looping — and do it BEFORE collecting the page, or the repeated page's
      // ids land in the result twice.
      const nextAfter = last.sort as string[];
      if (searchAfter && JSON.stringify(nextAfter) === JSON.stringify(searchAfter)) break;
      for (const hit of hits) if (hit._id !== undefined) ids.push(hit._id);
      if (nextAfter === undefined || nextAfter.length === 0) break;
      searchAfter = nextAfter;
    }
  } finally {
    try {
      await esClient.closePointInTime({ id: pitId });
    } catch {
      // The PIT expired (or the node is gone); nothing to release.
    }
  }
  return ids;
};
