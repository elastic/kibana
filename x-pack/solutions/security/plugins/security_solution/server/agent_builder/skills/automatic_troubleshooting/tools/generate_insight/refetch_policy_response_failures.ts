/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import { policyIndexPattern } from '../../../../../../common/endpoint/constants';
import { INITIAL_POLICY_ID } from '../../../../../endpoint/routes/policy';
import { prefixIndexPatternsWithCcs } from '../../../../../endpoint/utils/ccs_utils';

const POLICY_RESPONSE_INDEX_PATTERN = policyIndexPattern;
const DEFAULT_AGENT_BUCKET_SIZE = 1500;

interface PolicyResponseAction {
  name: string;
  message: string;
  status: string;
}

interface PolicyResponseAggregation {
  latest_actions: {
    buckets: Array<{
      key: string;
      doc_count: number;
      latest_event?: {
        hits?: {
          hits?: Array<{
            _id: string;
            _source?: {
              agent?: { id?: string };
              Endpoint?: {
                policy?: {
                  applied?: {
                    actions?: PolicyResponseAction[];
                  };
                };
              };
              host?: { os?: { name?: string } };
            };
          }>;
        };
      };
    }>;
  };
}

export interface PolicyResponseFailureEvent {
  _id: string[];
  'agent.id': string[];
  'host.os.name': string[];
  'actions.name': string[];
  'actions.message': string[];
  'actions.status': string[];
}

export interface RefetchPolicyResponseOptions {
  endpointIds: string[];
  size?: number;
  ccsEnabled?: boolean;
}

const isFailureOrWarning = (action: PolicyResponseAction): boolean =>
  action.status === 'failure' || action.status === 'warning';

const UNKNOWN_OS_NAME = 'unknown';

function buildQuery({
  endpointIds,
  size,
  ccsEnabled,
}: RefetchPolicyResponseOptions): SearchRequest {
  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: [prefixIndexPatternsWithCcs(POLICY_RESPONSE_INDEX_PATTERN, ccsEnabled ?? false)],
    query: {
      bool: {
        must: [
          {
            terms: {
              'agent.id': endpointIds,
            },
          },
        ],
        must_not: [
          {
            term: {
              'Endpoint.policy.applied.id': INITIAL_POLICY_ID,
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
          size: size ?? DEFAULT_AGENT_BUCKET_SIZE,
        },
        aggs: {
          latest_event: {
            top_hits: {
              size: 1,
              sort: [
                {
                  'event.created': {
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
  };
}

export async function getPolicyResponseFailureEvents(
  esClient: ElasticsearchClient,
  options: RefetchPolicyResponseOptions
): Promise<PolicyResponseFailureEvent[]> {
  const result = await esClient.search<SearchResponse, PolicyResponseAggregation>(
    buildQuery(options)
  );

  return (result.aggregations?.latest_actions.buckets ?? []).flatMap((bucket) => {
    const latestHit = bucket.latest_event?.hits?.hits?.[0];
    const failedActions = (latestHit?._source?.Endpoint?.policy?.applied?.actions ?? []).filter(
      isFailureOrWarning
    );

    if (!latestHit || failedActions.length === 0) {
      return [];
    }

    return [
      {
        _id: [latestHit._id],
        'agent.id': [latestHit._source?.agent?.id ?? ''],
        'host.os.name': [latestHit._source?.host?.os?.name ?? UNKNOWN_OS_NAME],
        'actions.name': failedActions.map((action) => action.name),
        'actions.message': failedActions.map((action) => action.message),
        'actions.status': failedActions.map((action) => action.status),
      },
    ];
  });
}
