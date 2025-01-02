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
import type {
  AssetCriticalityRecord,
  RiskScoresPreviewResponse,
} from '../../../../common/api/entity_analytics';
import type {
  AfterKeys,
  EntityRiskScoreRecord,
  RiskScoreWeights,
} from '../../../../common/api/entity_analytics/common';
import {
  type IdentifierType,
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
  identifierType: IdentifierType;
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
  identifierType: IdentifierType,
  weights?: RiskScoreWeights
): number | undefined =>
  weights?.find((weight) => weight.type === RiskWeightTypes.global)?.[identifierType];

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
  excludeAlertTags = [],
}: {
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
} & CalculateScoresParams): Promise<RiskScoresPreviewResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const now = new Date().toISOString();
    const scriptedMetricPainless = await getPainlessScripts();
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
    const identifierTypes: IdentifierType[] = identifierType ? [identifierType] : ['host', 'user'];
    const request = {
      size: 0,
      _source: false,
      index,
      ignore_unavailable: true,
      runtime_mappings: runtimeMappings,
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
      aggs: identifierTypes.reduce((aggs, _identifierType) => {
        aggs[_identifierType] = buildIdentifierTypeAggregation({
          afterKeys: userAfterKeys,
          identifierType: _identifierType,
          pageSize,
          weights,
          alertSampleSizePerShard,
          scriptedMetricPainless,
        });
        return aggs;
      }, {} as Record<string, AggregationsAggregationContainer>),
    };

    if (debug) {
      logger.info(`Executing Risk Score query:\n${JSON.stringify(request)}`);
    }

    const response = await esClient.search<never, CalculateRiskScoreAggregations>(request);

    if (debug) {
      logger.info(`Received Risk Score response:\n${JSON.stringify(response)}`);
    }

    if (response.aggregations == null) {
      return {
        ...(debug ? { request, response } : {}),
        after_keys: {},
        scores: {
          host: [],
          user: [],
        },
      };
    }

    const userBuckets = response.aggregations.user?.buckets ?? [];
    const hostBuckets = response.aggregations.host?.buckets ?? [];

    const afterKeys = {
      host: response.aggregations.host?.after_key,
      user: response.aggregations.user?.after_key,
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

    return {
      ...(debug ? { request, response } : {}),
      after_keys: afterKeys,
      scores: {
        host: hostScores,
        user: userScores,
      },
    };
  });
