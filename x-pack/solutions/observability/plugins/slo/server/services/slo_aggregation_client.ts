/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { AggregateSLOParams, AggregateSLOResponse } from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import type { SLOSettings } from '../domain/models';
import { getSummaryIndices } from './utils/get_summary_indices';
import { getElasticsearchQueryOrThrow } from './transform_generators';

interface AggregationBucket {
  key: string;
  doc_count: number;
  avg_sli: { value: number | null };
  avg_error_budget_consumed: { value: number | null };
}

export class SloAggregationClient {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private settings: SLOSettings
  ) {}

  async aggregate(params: AggregateSLOParams): Promise<AggregateSLOResponse> {
    const { groupBy, filter, size = 50 } = params;

    const { indices } = await getSummaryIndices(
      this.scopedClusterClient.asInternalUser,
      this.settings
    );

    const filterClauses: Array<Record<string, unknown>> = [
      { term: { spaceId: this.spaceId } },
      { term: { isTempDoc: false } },
    ];

    if (filter?.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        filterClauses.push({ term: { [`slo.metadata.${key}`]: value } });
      }
    }

    if (filter?.kqlQuery) {
      filterClauses.push(getElasticsearchQueryOrThrow(filter.kqlQuery));
    }

    if (filter?.status && filter.status.length > 0) {
      filterClauses.push({ terms: { status: filter.status } });
    }

    const result = await this.scopedClusterClient.asCurrentUser.search({
      index: indices.length > 0 ? indices : SUMMARY_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
      aggs: {
        groups: {
          terms: {
            field: groupBy,
            size,
          },
          aggs: {
            avg_sli: {
              avg: { field: 'sliValue' },
            },
            avg_error_budget_consumed: {
              avg: { field: 'errorBudgetConsumed' },
            },
          },
        },
      },
    });

    const buckets =
      (result.aggregations?.groups as { buckets: AggregationBucket[] })?.buckets ?? [];

    return {
      groups: buckets.map((bucket) => ({
        key: bucket.key,
        count: bucket.doc_count,
        avgSliValue: bucket.avg_sli.value ?? -1,
        avgErrorBudgetConsumed: bucket.avg_error_budget_consumed.value ?? 0,
      })),
    };
  }
}
