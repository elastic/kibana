/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { FieldValue, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERT_RISK_SCORE,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { toEntries } from 'fp-ts/Record';

import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import type { EntityType } from '../../../../common/search_strategy';
import type { ExperimentalFeatures } from '../../../../common';

import type {
  EntityAfterKey,
  EntityRiskScoreRecord,
} from '../../../../common/api/entity_analytics/common';

import { withSecuritySpan } from '../../../utils/with_security_span';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';

import type {
  CalculateResults,
  CalculateScoresParams,
  RiskScoreBucket,
  RiskScoreCompositeBuckets,
} from '../types';
import { RIEMANN_ZETA_S_VALUE, RIEMANN_ZETA_VALUE } from './constants';
import {
  filterFromRange,
  getGlobalWeightForIdentifierType,
  processScores,
} from './calculate_risk_scores';
type ESQLResults = Array<
  [EntityType, { scores: EntityRiskScoreRecord[]; afterKey: EntityAfterKey }, string[]]
>;

export const calculateScoresWithESQL = async (
  params: {
    assetCriticalityService: AssetCriticalityService;
    esClient: ElasticsearchClient;
    logger: Logger;
    experimentalFeatures: ExperimentalFeatures;
  } & CalculateScoresParams
): Promise<CalculateResults> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const {
      afterKeys,
      alertSampleSizePerShard,
      assetCriticalityService,
      esClient,
      identifierType,
      index,
      logger,
      pageSize,
      weights,
    } = params;
    const now = new Date().toISOString();

    const filter = getFilters(params);

    const identifierTypes: EntityType[] = identifierType
      ? [identifierType]
      : getEntityAnalyticsEntityTypes();

    const compositeQuery = getCompositeQuery(identifierTypes, filter, params);
    logger.trace(
      `STEP ONE: Executing ESQL Risk Score composite query:\n${JSON.stringify(compositeQuery)}`
    );
    const response = await esClient
      .search<never, RiskScoreCompositeBuckets>(compositeQuery)
      .catch((e) => {
        logger.error(`Error executing composite query: ${e.message}`);
      });

    if (!response?.aggregations) {
      return {
        after_keys: {},
        scores: {
          host: [],
          user: [],
          service: [],
        },
        entities: {
          user: [],
          service: [],
          host: [],
          generic: [],
        },
      };
    }

    const promises = toEntries(response.aggregations).map<Promise<ESQLResults[number]>>(
      ([entityType, { buckets, after_key: afterKey }]) => {
        const entities = buckets.map(({ key }) => key[EntityTypeToIdentifierField[entityType]]);

        if (entities.length === 0) {
          return Promise.resolve([
            entityType as EntityType,
            { afterKey: afterKey as EntityAfterKey, scores: [] },
            entities,
          ] satisfies ESQLResults[number]);
        }
        const bounds = {
          lower: afterKeys[entityType]?.[EntityTypeToIdentifierField[entityType]],
          upper: afterKey?.[EntityTypeToIdentifierField[entityType]],
        };

        const weight = getGlobalWeightForIdentifierType(entityType as EntityType, weights) || 1;

        const query = getESQL({
          entityType: entityType as EntityType,
          bounds,
          sampleSize: alertSampleSizePerShard || 10000,
          pageSize,
          index,
          weight,
        });

        return esClient.esql
          .query({
            query,
            filter: { bool: { filter } },
          })
          .then((rs) =>
            rs.values.map(buildRiskScoreBucket(entityType as EntityType, index, weight))
          )

          .then((riskScoreBuckets) => {
            return processScores({
              assetCriticalityService,
              buckets: riskScoreBuckets,
              identifierField: EntityTypeToIdentifierField[entityType],
              logger,
              now,
            });
          })
          .then((scores: EntityRiskScoreRecord[]): ESQLResults[number] => {
            return [
              entityType as EntityType,
              {
                scores,
                afterKey: afterKey as EntityAfterKey,
              },
              entities,
            ];
          })

          .catch((error) => {
            logger.error(
              `Error executing ESQL query for entity type ${entityType}: ${error.message}`
            );
            logger.error(`Query: ${query}`);
            return [
              entityType as EntityType,
              { afterKey: afterKey as EntityAfterKey, scores: [] },
              entities,
            ];
          });
      }
    );
    const esqlResults = await Promise.all(promises);

    const results: CalculateResults = esqlResults.reduce<{
      after_keys: Record<string, EntityAfterKey>;
      scores: Record<string, EntityRiskScoreRecord[]>;
      entities: Record<EntityType, string[]>;
    }>(
      (res, [entityType, { afterKey, scores }, entities]) => {
        res.after_keys[entityType] = afterKey;
        res.scores[entityType] = scores;
        res.entities[entityType] = entities;
        return res;
      },
      { after_keys: {}, scores: {}, entities: { user: [], service: [], host: [], generic: [] } }
    );

    return results;
  });

const getFilters = (options: CalculateScoresParams) => {
  const { excludeAlertStatuses = [], excludeAlertTags = [], range, filter: userFilter } = options;
  const filters = [filterFromRange(range), { exists: { field: ALERT_RISK_SCORE } }];
  if (excludeAlertStatuses.length > 0) {
    filters.push({
      bool: { must_not: { terms: { [ALERT_WORKFLOW_STATUS]: excludeAlertStatuses } } },
    });
  }
  if (!isEmpty(userFilter)) {
    filters.push(userFilter as QueryDslQueryContainer);
  }
  if (excludeAlertTags.length > 0) {
    filters.push({
      bool: { must_not: { terms: { [ALERT_WORKFLOW_TAGS]: excludeAlertTags } } },
    });
  }

  return filters;
};

export const getCompositeQuery = (
  entityTypes: EntityType[],
  filter: QueryDslQueryContainer[],
  params: CalculateScoresParams
) => {
  const { index, pageSize, runtimeMappings, afterKeys } = params;
  return {
    size: 0,
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
    aggs: entityTypes.reduce((aggs, entityType) => {
      const idField = EntityTypeToIdentifierField[entityType];
      return {
        ...aggs,
        [entityType]: {
          composite: {
            size: pageSize,
            sources: [{ [idField]: { terms: { field: idField } } }],
            after: afterKeys[entityType],
          },
        },
      };
    }, {}),
  };
};

export interface GetESQLParams {
  bounds: {
    lower?: string;
    upper?: string;
  };
  entityType: EntityType;
  index: string;
  pageSize: number;
  sampleSize: number;
  weight: number;
}

export const getESQL = ({
  entityType,
  bounds,
  sampleSize,
  pageSize,
  index,
  weight,
}: GetESQLParams) => {
  const identifierField = EntityTypeToIdentifierField[entityType];

  const lower = bounds.lower ? `${identifierField} > ${bounds.lower}` : undefined;
  const upper = bounds.upper ? `${identifierField} <= ${bounds.upper}` : undefined;
  if (!lower && !upper) {
    throw new Error('Either lower or upper after key must be provided for pagination');
  }
  const rangeClause = [lower, upper].filter(Boolean).join(' and ');

  const query = /* ESQL */ `
  FROM ${index} METADATA _index
    | WHERE kibana.alert.risk_score IS NOT NULL AND KQL("${rangeClause}")
    | RENAME kibana.alert.risk_score as risk_score,
             kibana.alert.rule.name as rule_name,
             kibana.alert.rule.uuid as rule_id,
             kibana.alert.uuid as alert_id,
             event.kind as category,
             @timestamp as time
    | EVAL input = CONCAT(""" {"score": """", risk_score::keyword, """", "time": """", time::keyword, """", "index": """", _index, """", "rule_name": """", rule_name, """\", "category": """", category, """\", "id": \"""", alert_id, """\" } """)
    | STATS
        alert_count = count(risk_score),
        scores = ${weight} * MV_PSERIES_WEIGHTED_SUM(TOP(risk_score, ${sampleSize}, "desc"), ${RIEMANN_ZETA_S_VALUE}),
        risk_inputs = TOP(input, 10, "desc")
    BY ${identifierField}
    | SORT scores DESC, ${identifierField} ASC
    | LIMIT ${pageSize}
  `;

  return query;
};

export const buildRiskScoreBucket =
  (entityType: EntityType, index: string, weight: number = 1) =>
  (row: FieldValue[]): RiskScoreBucket => {
    const [count, score, _inputs, entity] = row as [
      number,
      number,
      string | string[], // ES Multivalue nonsense: if it's just one value we get the value, if it's multiple we get an array
      string
    ];

    const inputs = (Array.isArray(_inputs) ? _inputs : [_inputs]).map((input, i) => {
      const parsedRiskInputData = JSON.parse(input);
      const value = parseFloat(parsedRiskInputData.score);
      const currentScore = value / Math.pow(i + 1, RIEMANN_ZETA_S_VALUE);
      return {
        ...parsedRiskInputData,
        score: value,
        contribution: currentScore / RIEMANN_ZETA_VALUE,
        index,
      };
    });

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
            category_1_score: score / weight, // category score before global weight applied and normalization
            category_1_count: count,
            risk_inputs: inputs,
          },
        },
      },
    };
  };
