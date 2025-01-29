/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsCompositeAggregation } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ALL_VALUE, GetSLOGroupingsParams, GetSLOGroupingsResponse } from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_NAME } from '../../common/constants';
import { SLODefinition, SLOSettings } from '../domain/models';
import { SloDefinitionClient } from './slo_definition_client';

const DEFAULT_SIZE = 100;

export class GetSLOGroupings {
  constructor(
    private definitionClient: SloDefinitionClient,
    private esClient: ElasticsearchClient,
    private sloSettings: SLOSettings,
    private spaceId: string
  ) {}

  public async execute(
    sloId: string,
    params: GetSLOGroupingsParams
  ): Promise<GetSLOGroupingsResponse> {
    const { slo } = await this.definitionClient.execute(sloId, this.spaceId, params.remoteName);

    const groupingKeys = [slo.groupBy].flat();
    if (groupingKeys.includes(ALL_VALUE) || params.instanceId === ALL_VALUE) {
      throw new Error('Ungrouped SLO cannot be queried for available groupings');
    }

    if (!groupingKeys.includes(params.groupingKey)) {
      throw new Error("Provided groupingKey doesn't match the SLO's groupBy field");
    }

    const groupingValues = params.instanceId.split(',') ?? [];
    if (groupingKeys.length !== groupingValues.length) {
      throw new Error('Provided instanceId does not match the number of grouping keys');
    }

    const response = await this.esClient.search<
      unknown,
      {
        groupingValues: {
          buckets: Array<{ key: { value: string } }>;
          after_key: { value: string };
        };
      }
    >({
      index: params.remoteName
        ? `${params.remoteName}:${SUMMARY_DESTINATION_INDEX_NAME}`
        : SUMMARY_DESTINATION_INDEX_NAME,
      ...generateQuery(slo, params, this.sloSettings),
    });

    return {
      groupingKey: params.groupingKey,
      values: response.aggregations?.groupingValues.buckets.map((bucket) => bucket.key.value) ?? [],
      afterKey:
        response.aggregations?.groupingValues.buckets.length === Number(params.size ?? DEFAULT_SIZE)
          ? response.aggregations?.groupingValues.after_key.value
          : undefined,
    };
  }
}

function generateQuery(slo: SLODefinition, params: GetSLOGroupingsParams, settings: SLOSettings) {
  const groupingKeys = [slo.groupBy].flat();
  const groupingValues = params.instanceId.split(',') ?? [];

  const groupingKeyValuePairs = groupingKeys.map((groupingKey, index) => [
    groupingKey,
    groupingValues[index],
  ]);

  const aggs = generateAggs(params);

  const query = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'slo.id': slo.id,
            },
          },
          {
            term: {
              'slo.revision': slo.revision,
            },
          },
          // exclude stale summary documents if specified
          ...(!!params.excludeStale
            ? [
                {
                  range: {
                    summaryUpdatedAt: {
                      gte: `now-${settings.staleThresholdInHours}h`,
                    },
                  },
                },
              ]
            : []),
          // Set other groupings as term filters
          ...groupingKeyValuePairs
            .filter(([groupingKey]) => groupingKey !== params.groupingKey)
            .map(([groupingKey, groupingValue]) => ({
              term: {
                [`slo.groupings.${groupingKey}`]: groupingValue,
              },
            })),
          // search on the specified groupingKey
          ...(params.search
            ? [
                {
                  query_string: {
                    default_field: `slo.groupings.${params.groupingKey}`,
                    query: `*${params.search.replace(/^\*/, '').replace(/\*$/, '')}*`,
                  },
                },
              ]
            : []),
        ],
      },
    },
    aggs,
  };

  return query;
}

function generateAggs(params: GetSLOGroupingsParams): {
  groupingValues: { composite: AggregationsCompositeAggregation };
} {
  return {
    groupingValues: {
      composite: {
        size: Number(params.size ?? DEFAULT_SIZE),
        sources: [
          {
            value: {
              terms: {
                field: `slo.groupings.${params.groupingKey}`,
              },
            },
          },
        ],
        ...(params.afterKey ? { after: { value: params.afterKey } } : {}),
      },
    },
  };
}
