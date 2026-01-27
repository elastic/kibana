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
import { IllegalArgumentError } from '../errors/errors';

interface SloTypeConfig {
  groupByField: string;
  getFilters: (params: GetSLOGroupedStatsParams) => estypes.QueryDslQueryContainer[];
}

const SLO_TYPE_CONFIG: Record<string, SloTypeConfig> = {
  apm: {
    groupByField: 'service.name',
    getFilters: (params) => [
      ...termsQuery(
        'slo.indicator.type',
        apmTransactionDurationIndicatorTypeSchema.value,
        apmTransactionErrorRateIndicatorTypeSchema.value
      ),
      ...termsQuery('service.name', ...(params.serviceNames ?? [])),
      ...termQuery('service.environment', params.environment),
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
            ...config.getFilters(params),
            ...excludeStaleSummaryFilter({ settings: this.settings, forceExclude: true }),
          ],
        },
      },
      aggs: {
        groups: {
          terms: {
            size: params.size,
            field: config.groupByField,
          },
          aggs: {
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
        noData: bucket.noData?.doc_count ?? 0,
        healthy: bucket.healthy?.doc_count ?? 0,
      },
    }));

    return { results };
  }

  private getConfig(type: string): SloTypeConfig | undefined {
    return SLO_TYPE_CONFIG[type];
  }
}
