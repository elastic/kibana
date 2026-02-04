/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  type FindSLOInstancesParams,
  type FindSLOInstancesResponse,
} from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { IllegalArgumentError } from '../errors';
import type { SLODefinitionClient } from './slo_definition_client';

const DEFAULT_SIZE = 100;

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  definitionClient: SLODefinitionClient;
}

export async function findSLOInstances(
  params: FindSLOInstancesParams,
  { scopedClusterClient, definitionClient }: Dependencies
): Promise<FindSLOInstancesResponse> {
  const { search, size = DEFAULT_SIZE, searchAfter, sloId, spaceId, remoteName } = params;
  if (size <= 0 || size > 1000) {
    throw new IllegalArgumentError('Size must be between 1 and 1000');
  }

  const { slo } = await definitionClient.execute(sloId, spaceId, remoteName);
  const groupBy = [slo.groupBy].flat();
  const isDefinedWithGroupBy = !groupBy.includes(ALL_VALUE);
  if (!isDefinedWithGroupBy) {
    return { results: [] };
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
    index: remoteName
      ? `${remoteName}:${SUMMARY_DESTINATION_INDEX_PATTERN}`
      : SUMMARY_DESTINATION_INDEX_PATTERN,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { spaceId } },
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          ...(search
            ? [
                {
                  wildcard: {
                    'slo.instanceId': {
                      value: `*${search.replace(/^\*/, '').replace(/\*$/, '')}*`,
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
    results: buckets.map((bucket) => ({
      instanceId: bucket.key.instanceId,
      groupings: toGroupings(bucket.key.instanceId, groupBy),
    })),
    searchAfter: buckets.length === size ? afterKey?.instanceId : undefined,
  };
}

function toGroupings(instanceId: string, groupBy: string[]): Record<string, string> {
  const groupingValues = instanceId.split(',') ?? [];
  if (groupingValues.length !== groupBy.length) {
    return {};
  }

  return groupBy.reduce((acc, groupKey, index) => {
    acc[groupKey] = groupingValues[index];
    return acc;
  }, {} as Record<string, string>);
}
