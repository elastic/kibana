/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse } from '@kbn/slo-schema';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { typedSearch } from '../utils/queries';
import { getSummaryIndices, getSloSettings } from './slo_settings';
import { getElasticsearchQueryOrThrow, parseStringFilters } from './transform_generators';
import { FindSLO } from './find_slo';
import type { SLORepository } from './slo_repository';
import { DefaultSummarySearchClient } from './summary_search_client/summary_search_client';

const SLO_PAGESIZE_LIMIT = 1000;

export class GetSLOStatsOverview {
  constructor(
    private soClient: SavedObjectsClientContract,
    private repository: SLORepository,
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private logger: Logger,
    private rulesClient: RulesClientApi,
    private racClient: AlertsClient
  ) {}

  public async execute(params: GetSLOStatsOverviewParams): Promise<GetSLOStatsOverviewResponse> {
    const settings = await getSloSettings(this.soClient);
    const { indices } = await getSummaryIndices(this.scopedClusterClient.asInternalUser, settings);

    const kqlQuery = params?.kqlQuery ?? '';
    const filters = params?.filters ?? '';
    const parsedFilters = parseStringFilters(filters, this.logger);

    const summarySearchClient = new DefaultSummarySearchClient(
      this.scopedClusterClient,
      this.soClient,
      this.logger,
      this.spaceId
    );

    let ruleFilters: string = '';
    let burnRateFilters: QueryDslQueryContainer[] = [];

    let querySLOsForIds = false;

    try {
      querySLOsForIds = !!(
        (params?.filters &&
          Object.values(JSON.parse(params.filters)).some(
            (value) => Array.isArray(value) && value.length > 0
          )) ||
        (params?.kqlQuery && params?.kqlQuery?.length > 0)
      );
    } catch (error) {
      querySLOsForIds = !!(params?.kqlQuery && params?.kqlQuery?.length > 0);
      this.logger.error(`Error parsing filters: ${error}`);
    }

    if (querySLOsForIds) {
      const findSLO = new FindSLO(this.repository, summarySearchClient);
      const sloIds = new Set<string>();

      const findSLOQueryParams = {
        filters: params?.filters,
        kqlQuery: params?.kqlQuery,
        perPage: String(SLO_PAGESIZE_LIMIT),
      };

      const findSLOResponse = await findSLO.execute(findSLOQueryParams);
      const total = findSLOResponse.total;
      const numCalls = Math.ceil(total / SLO_PAGESIZE_LIMIT);
      findSLOResponse.results.forEach((slo) => sloIds.add(slo.id));

      for (let i = 1; i < numCalls; i++) {
        const additionalCallResponse = await findSLO.execute({
          ...findSLOQueryParams,
          page: String(i + 1),
        });
        additionalCallResponse.results.forEach((slo) => sloIds.add(slo.id));
      }

      const sloIdsArray = Array.from(sloIds);

      const resultString = sloIdsArray.length
        ? sloIdsArray.reduce((accumulator, currentValue, index) => {
            const conditionString = `alert.attributes.params.sloId:${currentValue}`;
            if (index === 0) {
              return conditionString;
            } else {
              return accumulator + ' OR ' + conditionString;
            }
          }, '')
        : 'alert.attributes.params.sloId:NO_MATCHES';

      ruleFilters = resultString;
      burnRateFilters = [
        {
          terms: {
            'kibana.alert.rule.parameters.sloId': sloIdsArray,
          },
        },
      ];
    }

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
          ...(ruleFilters
            ? {
                filter: ruleFilters,
              }
            : {}),
        },
      }),

      this.racClient.getAlertSummary({
        ruleTypeIds: SLO_RULE_TYPE_IDS,
        consumers: [AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
        gte: moment().subtract(24, 'hours').toISOString(),
        lte: moment().toISOString(),
        ...(burnRateFilters?.length
          ? {
              filter: burnRateFilters,
            }
          : {}),
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
