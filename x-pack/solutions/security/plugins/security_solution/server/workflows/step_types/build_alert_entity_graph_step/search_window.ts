/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { toIso } from './number_utils';
import type { DetectionAlert800 } from '../../../../common/api/detection_engine/model/alerts';
import type { EsHit, EsSearchClient } from './types';

/**
 * Paginates through an ES alert index using `search_after`, invoking `onHit`
 * for each document. Stops when hits are exhausted or `stop()` returns true.
 *
 * Uses `@timestamp` + `kibana.alert.uuid` as the sort/tiebreaker
 * (not `_id`, which requires fielddata that is disabled by default).
 */
export const searchWindow = async (params: {
  esClient: EsSearchClient;
  index: string;
  gteMs: number;
  lteMs: number;
  shouldClauses: Array<Record<string, unknown>>;
  sourceFields: string[];
  pageSize: number;
  onHit: (hit: EsHit) => void;
  stop: () => boolean;
  queriesRef: { queries: number };
}): Promise<void> => {
  const {
    esClient,
    index,
    gteMs,
    lteMs,
    shouldClauses,
    sourceFields,
    pageSize,
    onHit,
    stop,
    queriesRef,
  } = params;

  let searchAfter: estypes.SortResults | undefined;
  while (!stop()) {
    const response = await esClient.search<DetectionAlert800>({
      index,
      // Hidden indices (like `.internal.*`) require explicit expansion.
      expand_wildcards: ['open', 'hidden'],
      size: pageSize,
      _source: sourceFields,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: toIso(gteMs),
                  lte: toIso(lteMs),
                },
              },
            },
            {
              bool: {
                should: shouldClauses,
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': 'asc' }, { 'kibana.alert.uuid': 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });
    queriesRef.queries++;

    const hits = response.hits.hits;
    if (!hits.length) break;

    for (const hit of hits) {
      onHit(hit);
      if (stop()) break;
    }

    const lastSort = hits[hits.length - 1]?.sort;
    if (!lastSort) break;
    searchAfter = lastSort;
  }
};
