/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath, SearchResponse, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { EventRetrieverOptions } from '.';

interface AggregationResponse {
  unique_process_executable: {
    buckets: Array<{
      key: string;
      doc_count: number;
      latest_event: {
        hits: {
          hits: Array<{
            _id: string;
            _source: {
              agent: { id: string };
              process: { executable: string };
            };
          }>;
        };
      };
    }>;
  };
}

const FILE_EVENTS_INDEX_PATTERN = 'logs-endpoint.events.file-*';
const SIZE = 1500;

function getFileEventsQuery({
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
    size: 0, // Aggregations only
    aggs: {
      unique_process_executable: {
        terms: {
          field: 'process.executable',
          size: size ?? SIZE,
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

export async function getFileEvents(esClient: ElasticsearchClient, options: EventRetrieverOptions) {
  const query = getFileEventsQuery(options);
  const result = await esClient.search<SearchResponse, AggregationResponse>(query);
  return (result.aggregations?.unique_process_executable.buckets ?? []).map((bucket) => {
    const latestEvent = bucket.latest_event.hits.hits[0];
    return {
      _id: [latestEvent._id],
      'agent.id': [latestEvent._source.agent.id],
      'process.executable': [latestEvent._source.process.executable],
    };
  });
}
