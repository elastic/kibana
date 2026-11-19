/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with
 * the Elastic License 2.0, at your election.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';

/**
 * Every doc `_id` in the time window, paged via search_after.
 *
 * Paging sorts on `_shard_doc`, never `_id`: since ES 8 fielddata on the `_id`
 * field is disabled by default (`indices.id_field_data.enabled: false`), so a
 * sort on `_id` fails the whole search with "Fielddata access on the _id field
 * is disallowed" and the caller's setup throws before any evaluation runs.
 */
export const listWindowIds = async (
  esClient: EsClient,
  index: string,
  window: { start: string; end: string }
): Promise<string[]> => {
  const ids: string[] = [];
  let searchAfter: string[] | undefined;
  for (;;) {
    const response = await esClient.search<{ _id: string; sort: string[] }>({
      index,
      size: 1000,
      sort: ['_shard_doc'],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: { range: { '@timestamp': { gte: window.start, lt: window.end } } },
    });
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
  return ids;
};
