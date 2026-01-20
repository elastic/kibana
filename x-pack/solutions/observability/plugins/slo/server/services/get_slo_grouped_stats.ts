/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import {
  SLO_STATUS,
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  type GetSLOGroupedStatsParams,
  type GetSLOGroupedStatsResponse,
  type GroupedStatsResult,
} from '@kbn/slo-schema';
import { termsQuery, termQuery } from '@kbn/observability-plugin/server';
import type { SLOSettings } from '../domain/models';
import { typedSearch } from '../utils/queries';
import { getSummaryIndices } from './utils/get_summary_indices';
import { excludeStaleSummaryFilter } from './utils/summary_stale_filter';

interface SloTypeConfig {
  groupByField: string;
  indicatorTypes: string[];
  getFilters: (params: GetSLOGroupedStatsParams) => estypes.QueryDslQueryContainer[];
}

const SLO_TYPE_CONFIG: Record<string, SloTypeConfig> = {
  apm: {
    groupByField: 'service.name',
    indicatorTypes: [
      apmTransactionDurationIndicatorTypeSchema.value,
      apmTransactionErrorRateIndicatorTypeSchema.value,
    ],
    getFilters: (params) => [
      ...termsQuery('service.name', ...(params.serviceNames ?? [])),
      ...termQuery('service.environment', params.environment),
    ],
  },
};

export class GetSLOGroupedStats {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private settings: SLOSettings
  ) {}

  public async execute(params: GetSLOGroupedStatsParams): Promise<GetSLOGroupedStatsResponse> {
    const { indices } = await getSummaryIndices(
      this.scopedClusterClient.asInternalUser,
      this.settings
    );

    const { size = 100 } = params;
    const config = this.getConfig(params.type);

    const response = await typedSearch(this.scopedClusterClient.asCurrentUser, {
      index: indices,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery('spaceId', this.spaceId),
            ...this.getFilters(params, config),
            ...excludeStaleSummaryFilter({ settings: this.settings, forceExclude: true }),
          ],
        },
      },
      aggs: {
        groups: {
          terms: {
            size,
            field: config?.groupByField ?? '',
          },
          aggs: {
            violated: {
              filter: { term: { status: SLO_STATUS.VIOLATED } },
            },
            degrading: {
              filter: { term: { status: SLO_STATUS.DEGRADING } },
            },
            healthy: {
              filter: { term: { status: SLO_STATUS.HEALTHY } },
            },
            noData: {
              filter: { term: { status: SLO_STATUS.NO_DATA } },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.groups?.buckets ?? [];

    const results: GroupedStatsResult[] = buckets.map((bucket) => ({
      entity: bucket.key as string,
      summary: {
        violated: bucket.violated?.doc_count ?? 0,
        degrading: bucket.degrading?.doc_count ?? 0,
        healthy: bucket.healthy?.doc_count ?? 0,
        noData: bucket.noData?.doc_count ?? 0,
      },
    }));

    return { results };
  }

  private getConfig(type: string): SloTypeConfig | undefined {
    return SLO_TYPE_CONFIG[type];
  }

  private getFilters(
    params: GetSLOGroupedStatsParams,
    config?: SloTypeConfig
  ): estypes.QueryDslQueryContainer[] {
    if (!config) return [];

    return [
      ...termsQuery('slo.indicator.type', ...config.indicatorTypes),
      ...config.getFilters(params),
    ];
  }
}
