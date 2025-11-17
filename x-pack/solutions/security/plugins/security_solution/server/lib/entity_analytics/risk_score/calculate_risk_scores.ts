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
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import type { EntityType } from '../../../../common/search_strategy';
import type { ExperimentalFeatures } from '../../../../common';
import type {
  AssetCriticalityRecord,
  RiskScoresPreviewResponse,
} from '../../../../common/api/entity_analytics';
import type {
  AfterKeys,
  EntityRiskScoreRecord,
  RiskScoreWeights,
  RiskScoreWeight,
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

const max10DecimalPlaces = (num: number) => Math.round(num * 1e10) / 1e10;

const formatForResponse = ({
  bucket,
  criticality,
  now,
  identifierField,
  includeNewFields,
  globalWeight,
}: {
  bucket: RiskScoreBucket;
  criticality?: AssetCriticalityRecord;
  now: string;
  identifierField: string;
  includeNewFields: boolean;
  globalWeight?: number;
}): EntityRiskScoreRecord => {
  const riskDetails = bucket.top_inputs.risk_details;

  // Apply global weight to the score if provided
  const weightedScore =
    globalWeight !== undefined ? riskDetails.value.score * globalWeight : riskDetails.value.score;
  const weightedNormalizedScore =
    globalWeight !== undefined
      ? riskDetails.value.normalized_score * globalWeight
      : riskDetails.value.normalized_score;

  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  const normalizedScoreWithCriticality = applyCriticalityToScore({
    score: weightedNormalizedScore,
    modifier: criticalityModifier,
  });
  const calculatedLevel = getRiskLevel(normalizedScoreWithCriticality);
  const categoryTwoScore = normalizedScoreWithCriticality - weightedNormalizedScore;
  const categoryTwoCount = criticalityModifier ? 1 : 0;

  const newFields = {
    category_2_score: max10DecimalPlaces(categoryTwoScore),
    category_2_count: categoryTwoCount,
    criticality_level: criticality?.criticality_level,
    criticality_modifier: criticalityModifier,
  };

  return {
    '@timestamp': now,
    id_field: identifierField,
    id_value: bucket.key[identifierField],
    calculated_level: calculatedLevel,
    calculated_score: max10DecimalPlaces(weightedScore),
    calculated_score_norm: max10DecimalPlaces(normalizedScoreWithCriticality),
    category_1_score: max10DecimalPlaces(riskDetails.value.category_1_score / RIEMANN_ZETA_VALUE), // normalize value to be between 0-100
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

/**
 * Builds filters for a specific entity type, including entity-specific custom filters
 */
export const buildFiltersForEntityType = (
  entityType: EntityType,
  userFilter: QueryDslQueryContainer,
  customFilters: Array<{ entity_types: string[]; filter: string }> = [],
  excludeAlertStatuses: string[] = [],
  excludeAlertTags: string[] = []
): QueryDslQueryContainer[] => {
  const filters: QueryDslQueryContainer[] = [{ exists: { field: ALERT_RISK_SCORE } }];

  // Add existing user filter (backward compatibility)
  if (!isEmpty(userFilter)) {
    filters.push(userFilter);
  }

  // Add alert status exclusions
  if (excludeAlertStatuses.length > 0) {
    filters.push({
      bool: { must_not: { terms: { [ALERT_WORKFLOW_STATUS]: excludeAlertStatuses } } },
    });
  }

  // Add alert tag exclusions
  if (excludeAlertTags.length > 0) {
    filters.push({
      bool: { must_not: { terms: { [ALERT_WORKFLOW_TAGS]: excludeAlertTags } } },
    });
  }

  // Add entity-specific custom filters (EXCLUSIVE - exclude matching alerts)
  customFilters
    .filter((f) => f.entity_types.includes(entityType))
    .forEach((f) => {
      try {
        const esQuery = toElasticsearchQuery(fromKueryExpression(f.filter));
        filters.push({
          bool: { must_not: esQuery },
        });
      } catch (error) {
        // Log warning but don't fail the entire query
        // Note: Invalid KQL filters are silently ignored to prevent query failures
      }
    });

  return filters;
};

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

export const processScores = async ({
  assetCriticalityService,
  buckets,
  identifierField,
  logger,
  now,
  identifierType,
  weights,
}: {
  assetCriticalityService: AssetCriticalityService;
  buckets: RiskScoreBucket[];
  identifierField: string;
  logger: Logger;
  now: string;
  identifierType?: EntityType;
  weights?: RiskScoreWeights;
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

  const globalWeight = identifierType
    ? getGlobalWeightForIdentifierType(identifierType, weights)
    : undefined;

  return buckets.map((bucket) => {
    const criticality = criticalities.find(
      (c) => c.id_field === identifierField && c.id_value === bucket.key[identifierField]
    );

    return formatForResponse({
      bucket,
      criticality,
      identifierField,
      now,
      includeNewFields: true,
      globalWeight,
    });
  });
};

export const getGlobalWeightForIdentifierType = (
  identifierType: EntityType,
  weights?: RiskScoreWeights
): number | undefined =>
  weights?.find((weight: RiskScoreWeight) => weight.type === RiskWeightTypes.global)?.[
    identifierType
  ];

export const calculateRiskScores = async ({
  afterKeys: userAfterKeys,
  assetCriticalityService,
  debug,
  esClient,
  filter: userFilter,
  identifierType,
  index,
  logger,
  pageSize,
  range,
  runtimeMappings,
  weights,
  alertSampleSizePerShard = 10_000,
  excludeAlertStatuses = [],
  experimentalFeatures,
  excludeAlertTags = [],
  filters: customFilters = [],
}: {
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
} & CalculateScoresParams & {
    filters?: Array<{ entity_types: string[]; filter: string }>;
  }): Promise<RiskScoresPreviewResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const now = new Date().toISOString();
    const scriptedMetricPainless = await getPainlessScripts();
    const identifierTypes: EntityType[] = identifierType
      ? [identifierType]
      : getEntityAnalyticsEntityTypes();

    // Build base filters that apply to all entity types
    const baseFilters = [filterFromRange(range), { exists: { field: ALERT_RISK_SCORE } }];

    // Create separate queries for each entity type with entity-specific filters
    const entityQueries = identifierTypes.map((_identifierType) => {
      // Build entity-specific filters
      const entityFilters = buildFiltersForEntityType(
        _identifierType,
        userFilter as QueryDslQueryContainer,
        customFilters,
        excludeAlertStatuses,
        excludeAlertTags
      );

      // Combine base filters with entity-specific filters
      const allFilters = [...baseFilters, ...entityFilters];

      return {
        entityType: _identifierType,
        request: {
          size: 0,
          _source: false,
          index,
          ignore_unavailable: true,
          runtime_mappings: runtimeMappings,
          query: {
            function_score: {
              query: {
                bool: {
                  filter: allFilters,
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
          aggs: {
            [_identifierType]: buildIdentifierTypeAggregation({
              afterKeys: userAfterKeys,
              identifierType: _identifierType,
              pageSize,
              weights,
              alertSampleSizePerShard,
              scriptedMetricPainless,
            }),
          },
        },
      };
    });

    // Execute queries for each entity type
    const responses = await Promise.all(
      entityQueries.map(async ({ entityType, request: entityRequest }) => {
        if (debug) {
          logger.info(
            `Executing Risk Score query for ${entityType}:\n${JSON.stringify(entityRequest)}`
          );
        }

        const response = await esClient.search<never, CalculateRiskScoreAggregations>(
          entityRequest
        );

        if (debug) {
          logger.info(
            `Received Risk Score response for ${entityType}:\n${JSON.stringify(response)}`
          );
        }

        return {
          entityType,
          response,
          request: entityRequest,
        };
      })
    );

    // Combine results from all entity queries
    const combinedAggregations: Partial<CalculateRiskScoreAggregations> = {};
    const combinedAfterKeys: Partial<AfterKeys> = {};

    responses.forEach(({ entityType, response }) => {
      if (response.aggregations && (response.aggregations as Record<string, unknown>)[entityType]) {
        (combinedAggregations as Record<string, unknown>)[entityType] = (
          response.aggregations as Record<string, unknown>
        )[entityType];
        (combinedAfterKeys as Record<string, unknown>)[entityType] = (
          response.aggregations as Record<string, { after_key?: Record<string, string> }>
        )[entityType]?.after_key;
      }
    });

    const userBuckets = combinedAggregations.user?.buckets ?? [];
    const hostBuckets = combinedAggregations.host?.buckets ?? [];
    const serviceBuckets = combinedAggregations.service?.buckets ?? [];

    const afterKeys = {
      host: combinedAfterKeys.host,
      user: combinedAfterKeys.user,
      service: experimentalFeatures ? combinedAfterKeys.service : undefined,
    };

    const hostScores = await processScores({
      assetCriticalityService,
      buckets: hostBuckets,
      identifierField: 'host.name',
      logger,
      now,
    });
    const userScores = await processScores({
      assetCriticalityService,
      buckets: userBuckets,
      identifierField: 'user.name',
      logger,
      now,
    });
    const serviceScores = await processScores({
      assetCriticalityService,
      buckets: serviceBuckets,
      identifierField: 'service.name',
      logger,
      now,
    });

    return {
      ...(debug
        ? {
            debug: {
              request: JSON.stringify(
                responses.map(({ entityType, request }) => ({ entityType, request }))
              ),
              response: JSON.stringify(
                responses.map(({ entityType, response }) => ({ entityType, response }))
              ),
            },
          }
        : {}),
      after_keys: afterKeys,
      scores: {
        host: hostScores,
        user: userScores,
        service: serviceScores,
      },
    };
  });
