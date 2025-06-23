/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse } from '@kbn/slo-schema';
import moment from 'moment';
import { typedSearch } from '../utils/queries';
import { getSummaryIndices, getSloSettings } from './slo_settings';
import { getElasticsearchQueryOrThrow, parseStringFilters } from './transform_generators';

export class GetSLOStatsOverview {
  constructor(
    private soClient: SavedObjectsClientContract,
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private logger: Logger,
    private rulesClient: RulesClientApi,
    private racClient: AlertsClient
  ) {}

  public async execute(params: GetSLOStatsOverviewParams): Promise<GetSLOStatsOverviewResponse> {
    const settings = await getSloSettings(this.soClient);
    const { indices } = await getSummaryIndices(this.scopedClusterClient.asInternalUser, settings);

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
          must_not: [...(parsedFilters.must_not ?? [])],
        },
      },
      aggs: {
        stale: {
          filter: {
            range: {
              summaryUpdatedAt: {
                lt: `now-${settings.staleThresholdInHours}h`,
              },
            },
          },
        },
        not_stale: {
          filter: {
            range: {
              summaryUpdatedAt: {
                gte: `now-${settings.staleThresholdInHours}h`,
              },
            },
          },
          aggs: {
            violated: {
              filter: {
                term: {
                  status: 'VIOLATED',
                },
              },
            },
            healthy: {
              filter: {
                term: {
                  status: 'HEALTHY',
                },
              },
            },
            degrading: {
              filter: {
                term: {
                  status: 'DEGRADING',
                },
              },
            },
            noData: {
              filter: {
                term: {
                  status: 'NO_DATA',
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

    return {
      violated: aggs?.not_stale?.violated.doc_count ?? 0,
      degrading: aggs?.not_stale?.degrading.doc_count ?? 0,
      healthy: aggs?.not_stale?.healthy?.doc_count ?? 0,
      noData: aggs?.not_stale?.noData.doc_count ?? 0,
      stale: aggs?.stale.doc_count ?? 0,
      burnRateRules: rules.total,
      burnRateActiveAlerts: alerts.activeAlertCount,
      burnRateRecoveredAlerts: alerts.recoveredAlertCount,
    };
  }
}
