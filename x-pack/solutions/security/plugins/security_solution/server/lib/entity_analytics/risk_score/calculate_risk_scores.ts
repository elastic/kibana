/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERT_RISK_SCORE,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { toEntries } from 'fp-ts/Record';
import { EntityDiscoveryAPIKey } from '@kbn/entityManager-plugin/server/lib/auth/api_key/api_key';
import type { Either } from 'fp-ts/Either';
import * as E from 'fp-ts/Either';
import { diff } from 'jest-diff';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import type { EntityType } from '../../../../common/search_strategy';
import type { ExperimentalFeatures } from '../../../../common';
import type {
  AssetCriticalityRecord,
  RiskScoresPreviewResponse,
} from '../../../../common/api/entity_analytics';
import type {
  AfterKeys,
  EntityAfterKey,
  EntityRiskScoreRecord,
  RiskScoreWeights,
} from '../../../../common/api/entity_analytics/common';
import {
  getRiskLevel,
  RiskCategories,
  RiskWeightTypes,
} from '../../../../common/entity_analytics/risk_engine';
import { withSecuritySpan } from '../../../utils/with_security_span';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import { applyCriticalityToScore, getCriticalityModifier } from '../asset_criticality/helpers';
import { getAfterKeyForIdentifierType, getFieldForIdentifier } from './helpers';
import type {
  CalculateRiskScoreAggregations,
  CalculateScoresParams,
  RiskScoreBucket,
} from '../types';
import { RIEMANN_ZETA_VALUE, RIEMANN_ZETA_S_VALUE } from './constants';
import { getPainlessScripts, type PainlessScripts } from './painless';

const formatForResponse = ({
  bucket,
  criticality,
  now,
  identifierField,
  includeNewFields,
}: {
  bucket: RiskScoreBucket;
  criticality?: AssetCriticalityRecord;
  now: string;
  identifierField: string;
  includeNewFields: boolean;
}): EntityRiskScoreRecord => {
  const riskDetails = bucket.top_inputs.risk_details;

  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  const normalizedScoreWithCriticality = applyCriticalityToScore({
    score: riskDetails.value.normalized_score,
    modifier: criticalityModifier,
  });
  const calculatedLevel = getRiskLevel(normalizedScoreWithCriticality);
  const categoryTwoScore = normalizedScoreWithCriticality - riskDetails.value.normalized_score;
  const categoryTwoCount = criticalityModifier ? 1 : 0;

  const newFields = {
    category_2_score: categoryTwoScore,
    category_2_count: categoryTwoCount,
    criticality_level: criticality?.criticality_level,
    criticality_modifier: criticalityModifier,
  };

  return {
    '@timestamp': now,
    id_field: identifierField,
    id_value: bucket.key[identifierField],
    calculated_level: calculatedLevel,
    calculated_score: riskDetails.value.score,
    calculated_score_norm: normalizedScoreWithCriticality,
    category_1_score: riskDetails.value.category_1_score / RIEMANN_ZETA_VALUE, // normalize value to be between 0-100
    category_1_count: riskDetails.value.category_1_count,
    notes: riskDetails.value.notes,
    inputs: riskDetails.value.risk_inputs.map((riskInput) => ({
      id: riskInput.id,
      index: riskInput.index,
      description: `Alert from Rule: ${riskInput.rule_name ?? 'RULE_NOT_FOUND'}`,
      category: RiskCategories.category_1,
      risk_score: riskInput.score,
      timestamp: riskInput.time,
      contribution_score: riskInput.contribution,
    })),
    ...(includeNewFields ? newFields : {}),
  };
};

export const filterFromRange = (range: CalculateScoresParams['range']): QueryDslQueryContainer => ({
  range: { '@timestamp': { lt: range.end, gte: range.start } },
});

const buildIdentifierTypeAggregation = ({
  afterKeys,
  identifierType,
  pageSize,
  weights,
  alertSampleSizePerShard,
  scriptedMetricPainless,
}: {
  afterKeys: AfterKeys;
  identifierType: EntityType;
  pageSize: number;
  weights?: RiskScoreWeights;
  alertSampleSizePerShard: number;
  scriptedMetricPainless: PainlessScripts;
}): AggregationsAggregationContainer => {
  const globalIdentifierTypeWeight = getGlobalWeightForIdentifierType(identifierType, weights);
  const identifierField = getFieldForIdentifier(identifierType);

  return {
    composite: {
      size: pageSize,
      sources: [
        {
          [identifierField]: {
            terms: {
              field: identifierField,
            },
          },
        },
      ],
      after: getAfterKeyForIdentifierType({ identifierType, afterKeys }),
    },
    aggs: {
      top_inputs: {
        sampler: {
          shard_size: alertSampleSizePerShard,
        },

        aggs: {
          risk_details: {
            scripted_metric: {
              init_script: scriptedMetricPainless.init,
              map_script: scriptedMetricPainless.map,
              combine_script: scriptedMetricPainless.combine,
              params: {
                p: RIEMANN_ZETA_S_VALUE,
                risk_cap: RIEMANN_ZETA_VALUE,
                global_identifier_type_weight: globalIdentifierTypeWeight || 1,
              },
              reduce_script: scriptedMetricPainless.reduce,
            },
          },
        },
      },
    },
  };
};

const processScores = async ({
  assetCriticalityService,
  buckets,
  identifierField,
  logger,
  now,
}: {
  assetCriticalityService: AssetCriticalityService;
  buckets: RiskScoreBucket[];
  identifierField: string;
  logger: Logger;
  now: string;
}): Promise<EntityRiskScoreRecord[]> => {
  if (buckets.length === 0) {
    return [];
  }

  const identifiers = buckets.map((bucket) => ({
    id_field: identifierField,
    id_value: bucket.key[identifierField],
  }));

  let criticalities: AssetCriticalityRecord[] = [];
  try {
    criticalities = await assetCriticalityService.getCriticalitiesByIdentifiers(identifiers);
  } catch (e) {
    logger.warn(
      `Error retrieving criticality: ${e}. Scoring will proceed without criticality information.`
    );
  }

  return buckets.map((bucket) => {
    const criticality = criticalities.find(
      (c) => c.id_field === identifierField && c.id_value === bucket.key[identifierField]
    );

    return formatForResponse({ bucket, criticality, identifierField, now, includeNewFields: true });
  });
};

export const getGlobalWeightForIdentifierType = (
  identifierType: EntityType,
  weights?: RiskScoreWeights
): number | undefined =>
  weights?.find((weight) => weight.type === RiskWeightTypes.global)?.[identifierType];

type ESQLResults = Array<
  [EntityType, { scores: EntityRiskScoreRecord[]; afterKey: EntityAfterKey }]
>;
const calculateWithESQL = async (
  params: {
    assetCriticalityService: AssetCriticalityService;
    esClient: ElasticsearchClient;
    logger: Logger;
    experimentalFeatures: ExperimentalFeatures;
  } & CalculateScoresParams
): Promise<Either<string, ESQLResults>> => {
  const { identifierType, logger, esClient } = params;
  const now = new Date().toISOString();

  const filter = getFilters(params);
  const identifierTypes: EntityType[] = identifierType
    ? [identifierType]
    : getEntityAnalyticsEntityTypes();

  const compositeQuery = getCompositeQuery(identifierTypes, filter, params);

  logger.trace(
    `STEP ONE: Executing ESQL Risk Score composite query:\n${JSON.stringify(compositeQuery)}`
  );
  const response = await esClient.search<never, RiskScoreCompositeBuckets>(compositeQuery);

  if (!response.aggregations) {
    return E.left('No aggregations in composite response');
  }

  const promises = toEntries(response.aggregations).map(
    ([entityType, { buckets, after_key: afterKey }]) => {
      const entities = buckets.map(({ key }) => key[EntityTypeToIdentifierField[entityType]]);

      if (entities.length === 0) {
        return Promise.resolve([
          entityType as EntityType,
          { afterKey, scores: [] },
        ] satisfies ESQLResults[number]);
      }
      const query = getESQL(entityType as EntityType, entities);
      return esClient.esql
        .query({ query })
        .then((rs) => {
          const legacyBuckets = rs.values.map((row): RiskScoreBucket => {
            const [count, score, inputs, entity] = row as [number, number, string[], string];

            return {
              key: { [EntityTypeToIdentifierField[entityType]]: entity },
              doc_count: count,
              top_inputs: {
                doc_count: inputs.length,
                risk_details: {
                  value: {
                    score,
                    normalized_score: score / RIEMANN_ZETA_VALUE, // normalize value to be between 0-100
                    notes: [],
                    category_1_score: score / RIEMANN_ZETA_VALUE, // normalize value to be between 0-100
                    category_1_count: 1,
                    risk_inputs: inputs.map((input) => JSON.parse(input)),
                  },
                },
              },
            };
          });

          return processScores({
            assetCriticalityService: params.assetCriticalityService,
            buckets: legacyBuckets,
            identifierField: EntityTypeToIdentifierField[entityType],
            logger,
            now,
          }).then((scores: EntityRiskScoreRecord[]): ESQLResults[number] => {
            return [
              entityType as EntityType,
              {
                scores,
                afterKey: afterKey as EntityAfterKey,
              },
            ];
          });
        })
        .catch((error) => {
          logger.error(
            `Error executing ESQL query for entity type ${entityType}: ${error.message}`
          );
          logger.error(`Query: ${query}`);
          return [entityType as EntityType, { afterKey, scores: [] }] satisfies ESQLResults[number];
        });
    }
  );
  const results = await Promise.all(promises);

  return E.right(results);
};

interface RiskScoreCompositeBuckets {
  user: {
    after_key: EntityAfterKey;
    buckets: RiskScoreCompositeBucket[];
  };
  host: {
    after_key: EntityAfterKey;
    buckets: RiskScoreCompositeBucket[];
  };
  service: {
    after_key: EntityAfterKey;
    buckets: RiskScoreCompositeBucket[];
  };
}

interface RiskScoreCompositeBucket {
  key: { [identifierField: string]: string };
  doc_count: number;
}

const getFilters = (options: CalculateScoresParams) => {
  const { excludeAlertStatuses = [], excludeAlertTags = [], range, filter: userFilter } = options;
  const filter = [filterFromRange(range), { exists: { field: ALERT_RISK_SCORE } }];
  if (excludeAlertStatuses.length > 0) {
    filter.push({
      bool: { must_not: { terms: { [ALERT_WORKFLOW_STATUS]: excludeAlertStatuses } } },
    });
  }
  if (!isEmpty(userFilter)) {
    filter.push(userFilter as QueryDslQueryContainer);
  }
  if (excludeAlertTags.length > 0) {
    filter.push({
      bool: { must_not: { terms: { [ALERT_WORKFLOW_TAGS]: excludeAlertTags } } },
    });
  }
  return filter;
};

export const getCompositeQuery = (
  entityTypes: EntityType[],
  filter: QueryDslQueryContainer[],
  params: CalculateScoresParams
) => {
  return {
    size: 0,
    index: params.index,
    ignore_unavailable: true,
    runtime_mappings: params.runtimeMappings,
    query: {
      function_score: {
        query: {
          bool: {
            filter,
            should: [
              {
                match_all: {}, // This forces ES to calculate score
              },
            ],
          },
        },
        field_value_factor: {
          field: ALERT_RISK_SCORE, // sort by risk score
        },
      },
    },
    aggs: entityTypes.reduce((aggs, entityType) => {
      const idField = EntityTypeToIdentifierField[entityType];
      return {
        ...aggs,
        [entityType]: {
          composite: {
            size: 100,
            sources: [{ [idField]: { terms: { field: idField } } }],
          },
        },
      };
    }, {}),
  };
};

export const getESQL = (entityType: EntityType, entities: string[]) => {
  const identifierField = EntityTypeToIdentifierField[entityType];
  const query = /* SQL */ `

  FROM .alerts-security.alerts-default
    | RENAME kibana.alert.risk_score as risk_score,
             kibana.alert.rule.name as rule_name,
             kibana.alert.rule.uuid as rule_id,
             kibana.alert.uuid as alert_id,
             @timestamp as time
    | KEEP ${identifierField}, risk_score, rule_name, rule_id, alert_id, time
    | WHERE ${identifierField} IN (${entities.map((e) => `"${e}"`).join(',')})
      AND risk_score IS NOT NULL
    | EVAL input = CONCAT(""" {"id": """", alert_id, """", "timestamp": """", time::keyword, """", "description": """", rule_name, """\", "risk_score": \"""", risk_score::keyword, """\" } """)
      /** 
       * The pablo fn works on multivalue fields only.
       * We need to agg the risk_score into a mv field, which is why we do TOP.
       * The 50 would be whatever max we get from the bucket.doc_count in the composite query
       **/
    | STATS
         alert_count = count(risk_score),
         scores = MV_PSERIES_WEIGHTED_SUM(TOP(risk_score, ${entities.length}, "desc"), 1.5),
         risk_inputs = TOP(input, 10, "desc")
      BY ${identifierField}
    | SORT scores DESC
    `;
  return query;
};

export const calculateRiskScores = async (
  params: {
    assetCriticalityService: AssetCriticalityService;
    esClient: ElasticsearchClient;
    logger: Logger;
    experimentalFeatures: ExperimentalFeatures;
  } & CalculateScoresParams
): Promise<RiskScoresPreviewResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    // const {
    //   afterKeys: userAfterKeys,
    //   assetCriticalityService,
    //   debug,
    //   esClient,
    //   filter: userFilter,
    //   identifierType,
    //   index,
    //   logger,
    //   pageSize,
    //   range,
    //   runtimeMappings,
    //   weights,
    //   alertSampleSizePerShard = 10_000,
    //   excludeAlertStatuses = [],
    //   experimentalFeatures,
    //   excludeAlertTags = [],
    // } = params;

    // const now = new Date().toISOString();
    // const scriptedMetricPainless = await getPainlessScripts();
    // const filter = [filterFromRange(range), { exists: { field: ALERT_RISK_SCORE } }];
    // if (excludeAlertStatuses.length > 0) {
    //   filter.push({
    //     bool: { must_not: { terms: { [ALERT_WORKFLOW_STATUS]: excludeAlertStatuses } } },
    //   });
    // }
    // if (!isEmpty(userFilter)) {
    //   filter.push(userFilter as QueryDslQueryContainer);
    // }
    // if (excludeAlertTags.length > 0) {
    //   filter.push({
    //     bool: { must_not: { terms: { [ALERT_WORKFLOW_TAGS]: excludeAlertTags } } },
    //   });
    // }
    // const identifierTypes: EntityType[] = identifierType
    //   ? [identifierType]
    //   : getEntityAnalyticsEntityTypes();

    // const request = {
    //   size: 0,
    //   _source: false,
    //   index,
    //   ignore_unavailable: true,
    //   runtime_mappings: runtimeMappings,
    //   query: {
    //     function_score: {
    //       query: {
    //         bool: {
    //           filter,
    //           should: [
    //             {
    //               match_all: {}, // This forces ES to calculate score
    //             },
    //           ],
    //         },
    //       },
    //       field_value_factor: {
    //         field: ALERT_RISK_SCORE, // sort by risk score
    //       },
    //     },
    //   },
    //   aggs: identifierTypes.reduce((aggs, _identifierType) => {
    //     aggs[_identifierType] = buildIdentifierTypeAggregation({
    //       afterKeys: userAfterKeys,
    //       identifierType: _identifierType,
    //       pageSize,
    //       weights,
    //       alertSampleSizePerShard,
    //       scriptedMetricPainless,
    //     });
    //     return aggs;
    //   }, {} as Record<string, AggregationsAggregationContainer>),
    // };

    // if (debug) {
    //   logger.info(`Executing Risk Score query:\n${JSON.stringify(request)}`);
    // }
    // const response = await esClient.search<never, CalculateRiskScoreAggregations>(request);

    // if (debug) {
    //   logger.info(`Received Risk Score response:\n${JSON.stringify(response)}`);
    // }

    // if (response.aggregations == null) {
    //   return {
    //     ...(debug ? { request, response } : {}),
    //     after_keys: {},
    //     scores: {
    //       host: [],
    //       user: [],
    //       service: [],
    //     },
    //   };
    // }

    // const userBuckets = response.aggregations.user?.buckets ?? [];
    // const hostBuckets = response.aggregations.host?.buckets ?? [];
    // const serviceBuckets = response.aggregations.service?.buckets ?? [];

    // const afterKeys = {
    //   host: response.aggregations.host?.after_key,
    //   user: response.aggregations.user?.after_key,
    //   service: experimentalFeatures ? response.aggregations.service?.after_key : undefined,
    // };

    // const hostScores = await processScores({
    //   assetCriticalityService,
    //   buckets: hostBuckets,
    //   identifierField: 'host.name',
    //   logger,
    //   now,
    // });
    // const userScores = await processScores({
    //   assetCriticalityService,
    //   buckets: userBuckets,
    //   identifierField: 'user.name',
    //   logger,
    //   now,
    // });
    // const serviceScores = await processScores({
    //   assetCriticalityService,
    //   buckets: serviceBuckets,
    //   identifierField: 'service.name',
    //   logger,
    //   now,
    // });

    // const legacyResults = {
    //   ...(debug ? { request, response } : {}),
    //   after_keys: afterKeys,
    //   scores: {
    //     host: hostScores,
    //     user: userScores,
    //     service: serviceScores,
    //   },
    // };

    const esqlResults = await calculateWithESQL(params);

    if (E.isLeft(esqlResults)) {
      return {
        after_keys: {},
        scores: {
          host: [],
          user: [],
          service: [],
        },
      };
    }

    const results = esqlResults.right.reduce<{
      after_keys: Record<string, EntityAfterKey>;
      scores: Record<string, EntityRiskScoreRecord[]>;
    }>(
      (res, [entityType, { afterKey, scores }]) => {
        res.after_keys[entityType] = afterKey;
        res.scores[entityType] = scores;
        return res;
      },
      { after_keys: {}, scores: {} }
    );

    return results;
    // return {
    //   ...(debug ? { request, response } : {}),
    //   after_keys: afterKeys,
    //   scores: {
    //     host: hostScores,
    //     user: userScores,
    //     service: serviceScores,
    //   },
    // };
  });
