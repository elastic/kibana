/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';

import { FILE_EVENTS_INDEX_PATTERN } from '../../../../../common/endpoint/constants';

const SIZE = 200;

export function getFileEventsQuery({ endpointIds }: { endpointIds: string[] }): SearchRequest {
  return {
    allow_no_indices: true,
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
                gte: 'now-24h',
                lte: 'now',
              },
            },
          },
        ],
      },
    },
    size: 0, // Aggregations only
    aggs: {
      unique_process_executable: {
        terms: {
          field: 'process.executable',
          size: SIZE,
        },
        aggs: {
          // Get the latest event for each process.executable
          latest_event: {
            top_hits: {
              size: 1,
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              _source: ['_id', 'agent.id', 'process.executable'], // Include only necessary fields
            },
          },
        },
      },
    },
    ignore_unavailable: true,
    index: [FILE_EVENTS_INDEX_PATTERN],
  };
}
