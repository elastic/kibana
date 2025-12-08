/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { FindSLOInstancesParams, FindSLOInstancesResponse } from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { IllegalArgumentError } from '../errors';

const DEFAULT_SIZE = 100;

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
}

export async function findSLOInstances(
  params: FindSLOInstancesParams,
  { scopedClusterClient }: Dependencies
): Promise<FindSLOInstancesResponse> {
  const { search, size = DEFAULT_SIZE, searchAfter, sloId, spaceId } = params;
  if (size <= 0 || size > 1000) {
    throw new IllegalArgumentError('Size must be between 1 and 1000');
  }

  const response = await scopedClusterClient.asCurrentUser.search<
    unknown,
    {
      instances: {
        buckets: Array<{ key: { instanceId: string } }>;
        after_key?: { instanceId: string };
      };
    }
  >({
    index: SUMMARY_DESTINATION_INDEX_PATTERN,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { spaceId } },
          { term: { 'slo.id': sloId } },
          ...(search
            ? [
                {
                  wildcard: {
                    'slo.instanceId': {
                      value: `*${search}*`,
                      case_insensitive: true,
                    },
                  },
                },
              ]
            : []),
        ],
      },
    },
    aggs: {
      instances: {
        composite: {
          ...(searchAfter ? { after: { instanceId: searchAfter } } : {}),
          size,
          sources: [{ instanceId: { terms: { field: 'slo.instanceId' } } }],
        },
      },
    },
  });

  const buckets = response.aggregations?.instances.buckets ?? [];
  const afterKey = response.aggregations?.instances.after_key;

  return {
    results: buckets.map((bucket) => ({ instanceId: bucket.key.instanceId })),
    searchAfter: buckets.length === size ? afterKey?.instanceId : undefined,
  };
}
