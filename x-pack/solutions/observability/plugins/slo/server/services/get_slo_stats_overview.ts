/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { type KueryNode, nodeBuilder } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse } from '@kbn/slo-schema';
import type {
  AggregationsAggregate,
  FieldValue,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { typedSearch } from '../utils/queries';
import { getSummaryIndices, getSloSettings } from './slo_settings';
import { getElasticsearchQueryOrThrow, parseStringFilters } from './transform_generators';

export const ES_PAGESIZE_LIMIT = 1000;

/*
    This service retrieves stats from alert and rule indices to display on the SLO landing page. 
    When filters are applied to SLOs, we want to forward those filters onto the searches performed on alerts and rules so the overview stats actively reflect viewable SLO data.
    To achieve this, we need to retrieve a list of all SLO ids and instanceIds that may appear across all SLO list pages
      to use them as filter conditions on the alert and rule stats that we want to count. 
*/

export class GetSLOStatsOverview {
  constructor(
    private soClient: SavedObjectsClientContract,
    private scopedClusterClient: IScopedClusterClient,
    private spaceId: string,
    private logger: Logger,
    private rulesClient: RulesClientApi,
    private racClient: AlertsClient
  ) {}

  private getAfterKey(
    agg: AggregationsAggregate | undefined
  ): Record<string, FieldValue> | undefined {
    if (agg && typeof agg === 'object' && 'after_key' in agg && agg.after_key) {
      return agg.after_key as Record<string, FieldValue>;
    }
    return undefined;
  }

  private processSloQueryBuckets(
    buckets: Array<{ key: { sloId: string; sloInstanceId: string } }>,
    instanceId?: string
  ): Array<{ bucketKey: string; query: QueryDslQueryContainer }> {
    return buckets.map((bucket) => {
      return {
        bucketKey: bucket.key.sloId,
        query: {
          bool: {
            must: [
              { term: { 'kibana.alert.rule.parameters.sloId': bucket.key.sloId } },
              ...(instanceId
                ? [
                    {
                      term: {
                        'kibana.alert.instance.id': bucket.key.sloInstanceId,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      };
    });
  }

  /*
     If we know there are no SLOs that match the provided filters, we can skip querying for rules and alerts
    */
  private async fetchRulesAndAlerts({
    querySLOsForIds,
    sloRuleQueryKeys,
    ruleFilters,
    alertFilters,
  }: {
    querySLOsForIds: boolean;
    sloRuleQueryKeys: string[];
    ruleFilters?: KueryNode;
    alertFilters?: QueryDslQueryContainer[];
  }) {
    return await Promise.all(
      querySLOsForIds && sloRuleQueryKeys.length === 0
        ? [
            {
              total: 0,
            },
            {
              activeAlertCount: 0,
              recoveredAlertCount: 0,
            },
          ]
        : [
            this.rulesClient.find({
              options: {
                ruleTypeIds: SLO_RULE_TYPE_IDS,
                consumers: [
                  AlertConsumers.SLO,
                  AlertConsumers.ALERTS,
                  AlertConsumers.OBSERVABILITY,
                ],
                ...(ruleFilters ? { filter: ruleFilters } : {}),
              },
            }),

            this.racClient.getAlertSummary({
              ruleTypeIds: SLO_RULE_TYPE_IDS,
              consumers: [AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
              gte: moment().subtract(24, 'hours').toISOString(),
              lte: moment().toISOString(),
              ...(alertFilters?.length
                ? {
                    filter: alertFilters,
                  }
                : {}),
            }),
          ]
    );
  }

  public async execute(params: GetSLOStatsOverviewParams): Promise<GetSLOStatsOverviewResponse> {
    const settings = await getSloSettings(this.soClient);
    const { indices } = await getSummaryIndices(this.scopedClusterClient.asInternalUser, settings);

    const kqlQuery = params?.kqlQuery ?? '';
    const filters = params?.filters ?? '';
    const parsedFilters = parseStringFilters(filters, this.logger);
    const kqlQueriesProvided = !!params?.kqlQuery && params?.kqlQuery?.length > 0;

    /*
      If there are any filters or KQL queries provided, we need to query for SLO ids and instanceIds to use as filter conditions on the alert and rule searches.
    */
    const filtersProvided =
      !!parsedFilters &&
      Object.keys(parsedFilters).some(
        (key) => Array.isArray(parsedFilters[key]) && parsedFilters[key].length > 0
      );
    const querySLOsForIds = filtersProvided || kqlQueriesProvided;

    const sloRuleQueryKeys: string[] = [];
    const instanceIdIncluded = Object.values(params).find(
      (value) => typeof value === 'string' && value.includes('slo.instanceId')
    );
    const alertFilterTerms: QueryDslQueryContainer[] = [];
    let afterKey: AggregationsAggregate | undefined;

    try {
      if (querySLOsForIds) {
        do {
          const sloIdCompositeQueryResponse = await this.scopedClusterClient.asCurrentUser.search({
            index: indices,
            size: 0,
            aggs: {
              sloIds: {
                composite: {
                  after: afterKey as Record<string, FieldValue>,
                  size: ES_PAGESIZE_LIMIT,
                  sources: [
                    {
                      sloId: { terms: { field: 'slo.id' } },
                    },
                    ...(instanceIdIncluded
                      ? [
                          {
                            sloInstanceId: { terms: { field: 'slo.instanceId' } },
                          },
                        ]
                      : []),
                  ],
                },
              },
            },
            query: {
              bool: {
                ...parsedFilters,
                ...(params.kqlQuery
                  ? {
                      must: [...(parsedFilters.must ?? []), { kql: { query: params.kqlQuery } }],
                    }
                  : {}),
              },
            },
          });

          afterKey = this.getAfterKey(sloIdCompositeQueryResponse.aggregations?.sloIds);

          const buckets = (
            sloIdCompositeQueryResponse.aggregations?.sloIds as {
              buckets?: Array<{ key: { sloId: string; sloInstanceId: string } }>;
            }
          )?.buckets;

          if (buckets) {
            const processedBuckets = this.processSloQueryBuckets(
              buckets,
              instanceIdIncluded as string | undefined
            );
            for (const { bucketKey, query } of processedBuckets) {
              alertFilterTerms.push(query);
              sloRuleQueryKeys.push(bucketKey);
            }
          }
        } while (afterKey);
      }
    } catch (error) {
      this.logger.error(`Error querying SLOs for IDs: ${error}`);
      throw error;
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

    const ruleFilters: KueryNode | undefined =
      sloRuleQueryKeys.length > 0
        ? nodeBuilder.or(
            sloRuleQueryKeys.map((sloId) => nodeBuilder.is(`alert.attributes.params.sloId`, sloId))
          )
        : undefined;
    const alertFilters =
      alertFilterTerms.length > 0
        ? [
            {
              bool: {
                should: [...alertFilterTerms],
              },
            },
          ]
        : [];

    const [rules, alerts] = await this.fetchRulesAndAlerts({
      querySLOsForIds,
      sloRuleQueryKeys,
      ruleFilters,
      alertFilters,
    });

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
