/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { EventRetrieverOptions } from '.';

interface AggregationResponse {
  latest_actions: {
    buckets: Array<{
      key: string;
      doc_count: number;
      latest_event: {
        hits: {
          hits: Array<{
            _id: string;
            _source: {
              agent: { id: string };
              Endpoint: {
                policy: {
                  applied: {
                    actions: {
                      name: string;
                      message: string;
                      status: string;
                    }[];
                  };
                };
              };
              host: { os: { name: string } };
            };
          }>;
        };
      };
    }>;
  };
}

const POLCY_RESPONSE_INDEX_PATTERN = 'metrics-endpoint.policy-*';
// only one per agent per day
const SIZE = 1500;

function getPolicyResponseEventsQuery({
  endpointIds,
  size,
  gte,
  lte,
}: EventRetrieverOptions): SearchRequest {
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
                gte: gte ?? 'now-7d',
                lte: lte ?? 'now',
              },
            },
          },
        ],
      },
    },
    size: 0,
    aggs: {
      latest_actions: {
        terms: {
          field: 'agent.id',
          size: size ?? SIZE,
        },
        aggs: {
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
              _source: ['_id', 'agent.id', 'host.os.name', 'Endpoint.policy.applied.actions'],
            },
          },
        },
      },
    },
    ignore_unavailable: true,
    index: [POLCY_RESPONSE_INDEX_PATTERN],
  };
}

export async function getPolicyResponseFailureEvents(
  esClient: ElasticsearchClient,
  options: EventRetrieverOptions
) {
  const query = getPolicyResponseEventsQuery(options);
  const result = await esClient.search<SearchResponse, AggregationResponse>(query);

  return (
    (result.aggregations?.latest_actions.buckets ?? [])
      // the `actions` field mapping is disabled so we need to filter post-query
      .filter((bucket) => {
        const actions = bucket.latest_event.hits.hits[0]._source.Endpoint.policy.applied.actions;
        return actions.some((action) => action.status === 'failure' || action.status === 'warning');
      })
      .map((bucket) => {
        const latestPolicyResponse = bucket.latest_event.hits.hits[0];
        const failedActions = latestPolicyResponse._source.Endpoint.policy.applied.actions.filter(
          (action) => action.status === 'failure' || action.status === 'warning'
        );
        return {
          _id: [latestPolicyResponse._id],
          'agent.id': [latestPolicyResponse._source.agent.id],
          'host.os.name': [latestPolicyResponse._source.host.os.name],
          'actions.name': failedActions.map((action) => action.name),
          'actions.message': failedActions.map((action) => action.message),
          'actions.status': failedActions.map((action) => action.status),
        };
      })
  );
}
