/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import {
  ALL_VALUE,
  SLO_GROUPINGS_PREFIX,
  SLO_STATUS,
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  type GetSLOGroupedStatsParams,
  type GetSLOGroupedStatsResponse,
  type GroupedStatsResult,
} from '@kbn/slo-schema';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termsQuery, termQuery } from '@kbn/observability-plugin/server';
import type { SLOSettings } from '../domain/models';
import { typedSearch } from '../utils/queries';
import { getSummaryIndices } from './utils/get_summary_indices';
import { excludeStaleSummaryFilter } from './utils/summary_stale_filter';
import { getElasticsearchQueryOrThrow } from './transform_generators/common';
import { IllegalArgumentError } from '../errors/errors';

interface SloTypeFields {
  // Top-level summary field that carries the entity for ungrouped / exact-service
  // SLOs (e.g. `service.name`). Used both to bucket results and to match a service.
  groupByField: string;
  // `slo.groupings.*` field that carries the entity for grouped-by-service.name SLO
  // instances, whose top-level `groupByField` is empty. Optional: SLO types without a
  // grouping only rely on `groupByField`.
  groupingField?: string;
}

interface SloTypeConfig extends SloTypeFields {
  getFilters: (
    params: GetSLOGroupedStatsParams,
    fields: SloTypeFields
  ) => estypes.QueryDslQueryContainer[];
}

function environmentFilter(environment?: string): QueryDslQueryContainer[] {
  if (!environment) {
    return [];
  }
  return [
    {
      bool: {
        should: [
          { term: { 'service.environment': environment } },
          { term: { 'service.environment': ALL_VALUE } },
          { bool: { must_not: { exists: { field: 'service.environment' } } } },
        ],
        minimum_should_match: 1,
      },
    },
  ];
}

function serviceNamesFilter(
  serviceNames: string[] | undefined,
  { groupByField, groupingField }: SloTypeFields
): QueryDslQueryContainer[] {
  if (!serviceNames?.length) {
    return [];
  }

  // Match a service under either representation: the top-level `groupByField`
  // (ungrouped / exact-service SLOs) or, when configured, the `slo.groupings.*`
  // `groupingField` (grouped-by-service.name instances).
  return [
    {
      bool: {
        should: [
          ...termsQuery(groupByField, ...serviceNames),
          ...(groupingField ? termsQuery(groupingField, ...serviceNames) : []),
        ],
        minimum_should_match: 1,
      },
    },
  ];
}

const STATUS_SUB_AGGS = {
  violated: {
    filter: { term: { status: SLO_STATUS.VIOLATED } },
  },
  degrading: {
    filter: { term: { status: SLO_STATUS.DEGRADING } },
  },
  noData: {
    filter: { term: { status: SLO_STATUS.NO_DATA } },
  },
  healthy: {
    filter: { term: { status: SLO_STATUS.HEALTHY } },
  },
} as const;

interface StatusBucket {
  key: string;
  violated?: { doc_count: number };
  degrading?: { doc_count: number };
  noData?: { doc_count: number };
  healthy?: { doc_count: number };
}

interface GroupedStatsAggregations {
  groups?: { buckets: StatusBucket[] };
  groupedGroups?: { groups?: { buckets: StatusBucket[] } };
}

function summaryTotal(summary: GroupedStatsResult['summary']): number {
  return summary.violated + summary.degrading + summary.noData + summary.healthy;
}

// Merges buckets coming from the top-level `service.name` aggregation and the
// grouped-by-service aggregation into a single entry per entity, then orders by
// total count descending to mirror the ordering of a single `terms` aggregation
// (which is otherwise lost once the two aggregations are combined).
function mergeStatusBuckets(buckets: StatusBucket[]): GroupedStatsResult[] {
  const merged = new Map<string, GroupedStatsResult>();

  for (const bucket of buckets) {
    const entity = bucket.key;
    const existing = merged.get(entity) ?? {
      entity,
      summary: { violated: 0, degrading: 0, noData: 0, healthy: 0 },
    };

    existing.summary.violated += bucket.violated?.doc_count ?? 0;
    existing.summary.degrading += bucket.degrading?.doc_count ?? 0;
    existing.summary.noData += bucket.noData?.doc_count ?? 0;
    existing.summary.healthy += bucket.healthy?.doc_count ?? 0;

    merged.set(entity, existing);
  }

  return Array.from(merged.values()).sort(
    (a, b) => summaryTotal(b.summary) - summaryTotal(a.summary)
  );
}

const SLO_TYPE_CONFIG: Record<string, SloTypeConfig> = {
  apm: {
    groupByField: 'service.name',
    groupingField: `${SLO_GROUPINGS_PREFIX}service.name`,
    getFilters: (params, fields) => [
      ...termsQuery(
        'slo.indicator.type',
        apmTransactionDurationIndicatorTypeSchema.value,
        apmTransactionErrorRateIndicatorTypeSchema.value
      ),
      ...serviceNamesFilter(params.serviceNames, fields),
      ...environmentFilter(params.environment),
    ],
  },
};

const MAX_SIZE = 1000;
const MIN_SIZE = 1;

export class GetSLOGroupedStats {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private settings: SLOSettings
  ) {}

  public async execute(params: GetSLOGroupedStatsParams): Promise<GetSLOGroupedStatsResponse> {
    const { size } = params;
    const config = this.getConfig(params.type);

    if (!config) {
      throw new IllegalArgumentError(`Unsupported SLO type: ${params.type}`);
    }
    if (size != null && size < MIN_SIZE) {
      throw new IllegalArgumentError(`size must be equal to or greater than ${MIN_SIZE}`);
    }
    if (size != null && size > MAX_SIZE) {
      throw new IllegalArgumentError(`size cannot be greater than ${MAX_SIZE}`);
    }

    const { indices } = await getSummaryIndices(
      this.scopedClusterClient.asInternalUser,
      this.settings
    );
    const response = await typedSearch(this.scopedClusterClient.asCurrentUser, {
      index: indices,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery('spaceId', this.spaceId),
            ...config.getFilters(params, config),
            ...excludeStaleSummaryFilter({
              settings: this.settings,
              kqlFilter: params.kqlQuery,
              forceExclude: true,
            }),
            ...(params.kqlQuery ? [getElasticsearchQueryOrThrow(params.kqlQuery)] : []),
            ...(params.statusFilters && params.statusFilters.length > 0
              ? termsQuery('status', ...params.statusFilters)
              : []),
          ],
        },
      },
      aggs: {
        groups: {
          terms: {
            size: params.size,
            field: config.groupByField,
          },
          aggs: STATUS_SUB_AGGS,
        },
        // Bucket grouped-by-service.name instances (which do not carry a top-level
        // service.name) by their grouping value. Exclude any doc that already has a
        // top-level service.name so a single summary doc is never counted in both
        // aggregations. Only added for SLO types that configure a grouping field.
        ...(config.groupingField
          ? {
              groupedGroups: {
                filter: {
                  bool: {
                    must_not: { exists: { field: config.groupByField } },
                  },
                },
                aggs: {
                  groups: {
                    terms: {
                      size: params.size,
                      field: config.groupingField,
                    },
                    aggs: STATUS_SUB_AGGS,
                  },
                },
              },
            }
          : {}),
      },
    });

    const aggregations = response.aggregations as GroupedStatsAggregations | undefined;
    const topLevelBuckets = aggregations?.groups?.buckets ?? [];
    const groupedBuckets = aggregations?.groupedGroups?.groups?.buckets ?? [];

    const results = mergeStatusBuckets([...topLevelBuckets, ...groupedBuckets]);

    if (params.size != null) {
      return { results: results.slice(0, params.size) };
    }

    return { results };
  }

  private getConfig(type: string): SloTypeConfig | undefined {
    return SLO_TYPE_CONFIG[type];
  }
}
