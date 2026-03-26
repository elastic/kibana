/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalHit } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/types';
import type { estypes } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Client } from '@elastic/elasticsearch';

function toArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

/**
 * Query Elasticsearch for a set of signals within a set of indices
 */
// TODO: fix this to use new API/schema
export const getSignalsWithES = async ({
  es,
  indices,
  ids,
}: {
  es: Client;
  indices: string | string[];
  ids: string | string[];
}): Promise<Map<string, Map<string, estypes.SearchHit<SignalHit>>>> => {
  const signals: TransportResult<estypes.SearchResponse<SignalHit>, unknown> = await es.search(
    {
      index: indices,
      size: 10000,
      query: {
        bool: {
          filter: [
            {
              ids: {
                values: toArray(ids),
              },
            },
          ],
        },
      },
    },
    { meta: true }
  );

  return signals.body.hits.hits.reduce((acc, hit) => {
    let indexMap = acc.get(hit._index);
    if (indexMap === undefined) {
      indexMap = new Map<string, estypes.SearchHit<SignalHit>>([[hit._id!, hit]]);
    } else {
      indexMap.set(hit._id!, hit);
    }
    acc.set(hit._index, indexMap);
    return acc;
  }, new Map<string, Map<string, estypes.SearchHit<SignalHit>>>());
};
