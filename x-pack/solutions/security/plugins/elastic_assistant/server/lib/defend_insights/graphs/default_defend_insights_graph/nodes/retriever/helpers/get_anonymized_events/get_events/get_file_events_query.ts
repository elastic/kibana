/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, DateMath } from '@elastic/elasticsearch/lib/api/types';

const FILE_EVENTS_INDEX_PATTERN = 'logs-endpoint.events.file-*';
const SIZE = 1500;

export function getFileEventsQuery({
  endpointIds,
  size,
  gte,
  lte,
}: {
  endpointIds: string[];
  size?: number;
  gte?: DateMath;
  lte?: DateMath;
}): SearchRequest {
  return {
    allow_no_indices: true,
    fields: ['_id', 'agent.id', 'process.executable'],
    query: {
      bool: {
        must: [
          {
            terms: {
              'agent.id': endpointIds,
            },
          },
          {
            range: {
              '@timestamp': {
                gte: gte ?? 'now-24h',
                lte: lte ?? 'now',
              },
            },
          },
        ],
      },
    },
    size: size ?? SIZE,
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: false,
    ignore_unavailable: true,
    index: [FILE_EVENTS_INDEX_PATTERN],
  };
}
