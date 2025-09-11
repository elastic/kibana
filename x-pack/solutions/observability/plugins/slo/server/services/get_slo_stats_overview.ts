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
import type {
  FieldValue,
  QueryDslQueryContainer,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { typedSearch } from '../utils/queries';
import { getSummaryIndices, getSloSettings } from './slo_settings';
import { getElasticsearchQueryOrThrow, parseStringFilters } from './transform_generators';

const ES_PAGESIZE_LIMIT = 5000;

function getAfterKey(agg: unknown): Record<string, FieldValue> | undefined {
  if (agg && typeof agg === 'object' && 'after_key' in agg && agg.after_key) {
    return agg.after_key as Record<string, FieldValue>;
  }
  return undefined;
}

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

    const kqlQuery = params?.kqlQuery ?? '';
    const filters = params?.filters ?? '';
    const parsedFilters = parseStringFilters(filters, this.logger);

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

    let sloKeysFromES: QueryDslQueryContainer[] = [];
    const sloRuleKeysFromES: string[] = [];
    let afterKey: Record<string, FieldValue> | undefined;

    let totalHits = 0;

    const boolFilters = JSON.parse(params.filters || '{}');
    if (params.kqlQuery) {
      boolFilters.must.push({
        kql: { query: params.kqlQuery },
      });
    }

    const instanceIdIncluded = Object.values(params).find(
      (value) => typeof value === 'string' && value.includes('slo.instanceId')
    );

    try {
      if (querySLOsForIds) {
        do {
          const sloIdCompositeQueryResponse = await this.scopedClusterClient.asCurrentUser.search({
            size: 0,
            aggs: {
              sloIds: {
                composite: {
                  after: afterKey,
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
            index: '.slo-observability.summary-*',
            _source: ['slo.id', 'slo.instanceId'],
            ...(Object.values(boolFilters).some((value) => Array.isArray(value) && value.length > 0)
              ? {
                  query: {
                    bool: boolFilters,
                  },
                }
              : {}),
          });

          totalHits = (sloIdCompositeQueryResponse.hits?.total as SearchTotalHits).value || 0;
          afterKey = getAfterKey(sloIdCompositeQueryResponse.aggregations?.sloIds);

          const buckets = (
            sloIdCompositeQueryResponse.aggregations?.sloIds as {
              buckets?: Array<{ key: { sloId: string; sloInstanceId: string } }>;
            }
          )?.buckets;
          if (buckets && buckets.length > 0) {
            sloKeysFromES = sloKeysFromES.concat(
              ...buckets.map((bucket) => {
                sloRuleKeysFromES.push(bucket.key.sloId);
                return {
                  bool: {
                    must: [
                      { term: { 'kibana.alert.rule.parameters.sloId': bucket.key.sloId } },
                      ...(instanceIdIncluded
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
                };
              })
            );
          }
        } while (afterKey);

        const sloIdsArray = Array.from(sloRuleKeysFromES);

        const resultString = sloIdsArray.length
          ? sloIdsArray.reduce((accumulator, currentValue, index) => {
              const conditionString = `(alert.attributes.params.sloId:${currentValue} )`;
              if (index === 0 || ruleFilters.length === 0) {
                return conditionString;
              } else {
                return accumulator + ' OR ' + conditionString;
              }
            }, ruleFilters)
          : 'alert.attributes.params.sloId:NO_MATCHES';

        ruleFilters = resultString;

        burnRateFilters = [
          {
            bool: {
              should: [...sloKeysFromES],
            },
          },
        ];
      } else {
        totalHits = -1;
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
      burnRateActiveAlerts: totalHits ? alerts.activeAlertCount : 0,
      burnRateRecoveredAlerts: totalHits ? alerts.recoveredAlertCount : 0,
    };
  }
}
