/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, omit } from 'lodash';
import type { FieldValue, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
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

import type { RiskScoresPreviewResponse } from '../../../../common/api/entity_analytics';
import type { CalculateScoresParams, RiskScoreBucket, RiskScoreCompositeBuckets } from '../types';
import { RIEMANN_ZETA_S_VALUE, RIEMANN_ZETA_VALUE } from './constants';
import { filterFromRange } from './helpers';
import { applyScoreModifiers } from './apply_score_modifiers';
import type { PrivmonUserCrudService } from '../privilege_monitoring/users/privileged_users_crud';

type ESQLResults = Array<
  [EntityType, { scores: EntityRiskScoreRecord[]; afterKey: EntityAfterKey }]
>;

export const calculateScoresWithESQL = async (
  params: {
    assetCriticalityService: AssetCriticalityService;
    privmonUserCrudService: PrivmonUserCrudService;
    esClient: ElasticsearchClient;
    logger: Logger;
    experimentalFeatures: ExperimentalFeatures;
  } & CalculateScoresParams & {
      filters?: Array<{ entity_types: string[]; filter: string }>;
    }
): Promise<RiskScoresPreviewResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const { identifierType, logger, esClient } = params;
    const now = new Date().toISOString();

    const identifierTypes: EntityType[] = identifierType
      ? [identifierType]
      : getEntityAnalyticsEntityTypes();

    // Create separate queries for each entity type with entity-specific filters
    const entityQueries = identifierTypes.map((entityType) => {
      const filter = getFilters(params, entityType);
      return {
        entityType,
        query: getCompositeQuery([entityType], filter, params),
      };
    });

    logger.trace(
      `STEP ONE: Executing ESQL Risk Score queries for entity types: ${identifierTypes.join(', ')}`
    );

    // Execute queries for each entity type
    const responses = await Promise.all(
      entityQueries.map(async ({ entityType, query }) => {
        logger.trace(
          `Executing ESQL Risk Score query for ${entityType}:\n${JSON.stringify(query)}`
        );

        let error: unknown = null;
        const response = await esClient
          .search<never, RiskScoreCompositeBuckets>(query)
          .catch((e) => {
            logger.error(`Error executing composite query for ${entityType}: ${e.message}`);
            error = e;
            return null;
          });

        return {
          entityType,
          response,
          query,
          error,
        };
      })
    );

    // Combine results from all entity queries
    const combinedAggregations: Partial<RiskScoreCompositeBuckets> = {};
    responses.forEach(({ entityType, response }) => {
      if (
        response?.aggregations &&
        (response.aggregations as unknown as Record<string, unknown>)[entityType]
      ) {
        (combinedAggregations as Record<string, unknown>)[entityType] = (
          response.aggregations as unknown as Record<string, unknown>
        )[entityType];
      }
    });

    // Check if all queries that had errors failed due to index_not_found_exception
    const errorsPresent = responses.filter(({ error }) => error).length;
    const indexNotFoundErrors = responses.filter(({ error }) => {
      if (!error) return false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return (
        errorMessage.includes('index_not_found_exception') ||
        errorMessage.includes('no such index') ||
        errorMessage.includes('NoShardAvailableActionException')
      );
    }).length;

    // If we have no aggregations, return empty scores if:
    // 1. All queries that had errors were index-not-found errors
    // 2. OR there were no errors at all (valid index pattern with no data)
    const shouldReturnEmptyScores =
      errorsPresent === 0 || (errorsPresent > 0 && errorsPresent === indexNotFoundErrors);

    if (Object.keys(combinedAggregations).length === 0) {
      if (shouldReturnEmptyScores) {
        return {
          after_keys: {},
          scores: {
            host: [],
            user: [],
            service: [],
          },
        };
      }
      // Log the actual errors for debugging
      responses.forEach(({ entityType, error }) => {
        if (error) {
          logger.error(
            `Query failed for ${entityType}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      });
      // Otherwise, throw an error as before
      throw new Error('No aggregations in any composite response');
    }

    const promises = toEntries(combinedAggregations as Record<string, unknown>).map(
      async ([entityType, aggregationData]: [string, unknown]) => {
        const { buckets, after_key: afterKey } = aggregationData as {
          buckets: Array<{ key: Record<string, string> }>;
          after_key?: Record<string, string>;
        };
        const entities = buckets.map(
          ({ key }) => key[(EntityTypeToIdentifierField as Record<string, string>)[entityType]]
        );

        if (entities.length === 0) {
          return Promise.resolve([
            entityType as EntityType,
            { afterKey: afterKey || {}, scores: [] },
          ] satisfies ESQLResults[number]);
        }
        const bounds = {
          lower: (params.afterKeys as Record<string, Record<string, string>>)[entityType]?.[
            (EntityTypeToIdentifierField as Record<string, string>)[entityType]
          ],
          upper: afterKey?.[(EntityTypeToIdentifierField as Record<string, string>)[entityType]],
        };

        const query = getESQL(
          entityType as EntityType,
          bounds,
          params.alertSampleSizePerShard || 10000,
          params.pageSize,
          params.index
        );

        const entityFilter = getFilters(params, entityType as EntityType);
        return esClient.esql
          .query({
            query,
            filter: { bool: { filter: entityFilter } },
          })
          .then((rs) => rs.values.map(buildRiskScoreBucket(entityType as EntityType, params.index)))

          .then(async (riskScoreBuckets) => {
            const results = await applyScoreModifiers({
              now,
              experimentalFeatures: params.experimentalFeatures,
              identifierType: entityType as EntityType,
              deps: {
                assetCriticalityService: params.assetCriticalityService,
                privmonUserCrudService: params.privmonUserCrudService,
                logger,
              },
              weights: params.weights,
              page: {
                buckets: riskScoreBuckets,
                bounds,
                identifierField: (EntityTypeToIdentifierField as Record<string, string>)[
                  entityType
                ],
              },
            });

            return results;
          })
          .then((scores: EntityRiskScoreRecord[]): ESQLResults[number] => {
            return [
              entityType as EntityType,
              {
                scores,
                afterKey: afterKey as EntityAfterKey,
              },
            ];
          })

          .catch((error) => {
            logger.error(
              `Error executing ESQL query for entity type ${entityType}: ${error.message}`
            );
            logger.error(`Query: ${query}`);
            return [
              entityType as EntityType,
              { afterKey: afterKey || {}, scores: [] },
            ] satisfies ESQLResults[number];
          });
      }
    );
    const esqlResults = await Promise.all(promises);

    const results: RiskScoresPreviewResponse = esqlResults.reduce<RiskScoresPreviewResponse>(
      (res, [entityType, { afterKey, scores }]) => {
        res.after_keys[entityType] = afterKey || {};
        res.scores[entityType] = scores;
        return res;
      },
      { after_keys: {}, scores: {} }
    );

    return results;
  });

const getFilters = (options: CalculateScoresParams, entityType?: EntityType) => {
  const {
    excludeAlertStatuses = [],
    excludeAlertTags = [],
    range,
    filter: userFilter,
    filters: customFilters,
  } = options;
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

  // Apply entity-specific custom filters (EXCLUSIVE - exclude matching alerts)
  if (customFilters && customFilters.length > 0 && entityType) {
    customFilters
      .filter((customFilter) => customFilter.entity_types.includes(entityType))
      .forEach((customFilter) => {
        try {
          const kqlQuery = fromKueryExpression(customFilter.filter);
          const esQuery = toElasticsearchQuery(kqlQuery);
          if (esQuery) {
            filters.push({
              bool: { must: esQuery },
            });
          }
        } catch (error) {
          // Silently ignore invalid KQL filters to prevent query failures
        }
      });
  }

  return filters;
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
            size: params.pageSize,
            sources: [{ [idField]: { terms: { field: idField } } }],
            after: params.afterKeys[entityType],
          },
        },
      };
    }, {}),
  };
};

export const getESQL = (
  entityType: EntityType,
  afterKeys: {
    lower?: string;
    upper?: string;
  },
  sampleSize: number,
  pageSize: number,
  index: string = '.alerts-security.alerts-default'
) => {
  const identifierField = EntityTypeToIdentifierField[entityType];

  const lower = afterKeys.lower ? `${identifierField} > ${afterKeys.lower}` : undefined;
  const upper = afterKeys.upper ? `${identifierField} <= ${afterKeys.upper}` : undefined;
  if (!lower && !upper) {
    throw new Error('Either lower or upper after key must be provided for pagination');
  }
  const rangeClause = [lower, upper].filter(Boolean).join(' and ');

  const query = /* SQL */ `
  FROM ${index} METADATA _index
    | WHERE kibana.alert.risk_score IS NOT NULL AND KQL("${rangeClause}")
    | RENAME kibana.alert.risk_score as risk_score,
             kibana.alert.rule.name as rule_name,
             kibana.alert.rule.uuid as rule_id,
             kibana.alert.uuid as alert_id,
             event.kind as category,
             @timestamp as time
    | EVAL rule_name_b64 = TO_BASE64(rule_name),
           category_b64 = TO_BASE64(category)
    | EVAL input = CONCAT(""" {"risk_score": """", risk_score::keyword, """", "time": """", time::keyword, """", "index": """", _index, """", "rule_name_b64": """", rule_name_b64, """\", "category_b64": """", category_b64, """\", "id": \"""", alert_id, """\" } """)
    | STATS
        alert_count = count(risk_score),
        scores = MV_PSERIES_WEIGHTED_SUM(TOP(risk_score, ${sampleSize}, "desc"), ${RIEMANN_ZETA_S_VALUE}),
        risk_inputs = TOP(input, 10, "desc")
    BY ${identifierField}
    | SORT scores DESC
    | LIMIT ${pageSize}
  `;

  return query;
};

export const buildRiskScoreBucket =
  (entityType: EntityType, index: string) =>
  (row: FieldValue[]): RiskScoreBucket => {
    const [count, score, _inputs, entity] = row as [
      number,
      number,
      string | string[], // ES Multivalue nonsense: if it's just one value we get the value, if it's multiple we get an array
      string
    ];

    const inputs = (Array.isArray(_inputs) ? _inputs : [_inputs]).map((input, i) => {
      let parsedRiskInputData = JSON.parse('{}');
      let ruleName: string | undefined;
      let category: string | undefined;

      try {
        // Parse JSON and decode Base64 encoded fields to handle special characters (quotes, backslashes, newlines, etc.)
        parsedRiskInputData = JSON.parse(input);

        ruleName = parsedRiskInputData.rule_name_b64
          ? Buffer.from(parsedRiskInputData.rule_name_b64, 'base64').toString('utf-8')
          : parsedRiskInputData.rule_name; // Fallback for backward compatibility
        category = parsedRiskInputData.category_b64
          ? Buffer.from(parsedRiskInputData.category_b64, 'base64').toString('utf-8')
          : parsedRiskInputData.category; // Fallback for backward compatibility
      } catch {
        // Attempt to use fallback values if parsedRiskInputData was parsed but decoding failed
        if (parsedRiskInputData && Object.keys(parsedRiskInputData).length > 0) {
          ruleName = parsedRiskInputData.rule_name;
          category = parsedRiskInputData.category;
        }
      }

      const value = parseFloat(parsedRiskInputData.risk_score);
      const currentScore = value / Math.pow(i + 1, RIEMANN_ZETA_S_VALUE);
      const otherFields = omit(parsedRiskInputData, [
        'risk_score',
        'rule_name',
        'rule_name_b64',
        'category',
        'category_b64',
      ]);

      return {
        id: parsedRiskInputData.id,
        ...otherFields,
        rule_name: ruleName,
        category,
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
            category_1_score: score, // Don't normalize here - will be normalized in calculate_risk_scores.ts
            category_1_count: count,
            risk_inputs: inputs,
          },
        },
      },
    };
  };
