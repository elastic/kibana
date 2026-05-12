/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse } from '@kbn/slo-schema';
import moment from 'moment';
import type { SLOSettings } from '../domain/models';
import { typedSearch } from '../utils/queries';
import { getElasticsearchQueryOrThrow, parseStringFilters } from './transform_generators';
import { getSummaryIndices } from './utils/get_summary_indices';

export class GetSLOStatsOverview {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private logger: Logger,
    private rulesClient: RulesClientApi,
    private racClient: AlertsClient,
    private settings: SLOSettings
  ) {}

  public async execute(params: GetSLOStatsOverviewParams): Promise<GetSLOStatsOverviewResponse> {
    const { indices } = await getSummaryIndices(
      this.scopedClusterClient.asInternalUser,
      this.settings
    );

    const kqlQuery = params.kqlQuery ?? '';
    const filters = params.filters ?? '';
    const parsedFilters = parseStringFilters(filters, this.logger);

    const response = await typedSearch(this.scopedClusterClient.asCurrentUser, {
      index: indices,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
            getElasticsearchQueryOrThrow(kqlQuery),
            ...(parsedFilters.filter ?? []),
          ],
          must: parsedFilters.must ?? [],
          should: parsedFilters.should ?? [],
          must_not: parsedFilters.must_not ?? [],
        },
      },
      aggs: {
        by_status: {
          terms: {
            size: 10,
            field: 'status',
          },
          aggs: {
            stale: {
              filter: {
                range: {
                  summaryUpdatedAt: {
                    lt: `now-${this.settings.staleThresholdInHours}h`,
                  },
                },
              },
            },
          },
        },
      },
    });

    const [rules, alerts] = await Promise.all([
      this.rulesClient.find({
        options: {
          ruleTypeIds: SLO_RULE_TYPE_IDS,
          consumers: [AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
        },
      }),

      this.racClient.getAlertSummary({
        ruleTypeIds: SLO_RULE_TYPE_IDS,
        consumers: [AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
        gte: moment().subtract(24, 'hours').toISOString(),
        lte: moment().toISOString(),
      }),
    ]);

    const aggs = response.aggregations;
    const statusBuckets = aggs?.by_status?.buckets ?? [];

    const getStatusStats = (status: string) => {
      const bucket = statusBuckets.find((b) => b.key === status);
      return {
        total: bucket?.doc_count ?? 0,
        stale: bucket?.stale?.doc_count ?? 0,
      };
    };

    return {
      healthy: getStatusStats('HEALTHY'),
      violated: getStatusStats('VIOLATED'),
      degrading: getStatusStats('DEGRADING'),
      noData: getStatusStats('NO_DATA'),
      burnRateRules: rules.total,
      burnRateActiveAlerts: alerts.activeAlertCount,
      burnRateRecoveredAlerts: alerts.recoveredAlertCount,
    };
  }
}
