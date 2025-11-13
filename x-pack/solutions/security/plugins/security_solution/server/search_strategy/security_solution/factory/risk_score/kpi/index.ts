/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import type { IEsSearchResponse } from '@kbn/search-types';

import type { EntityRiskQueries } from '../../../../../../common/api/search_strategy';
import type {
  KpiRiskScoreStrategyResponse,
  RiskSeverity,
} from '../../../../../../common/search_strategy';

import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { RiskScoreFields, EntityTypeToLevelField } from '../../../../../../common/search_strategy';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildKpiRiskScoreQuery } from './query.kpi_risk_score.dsl';

interface AggBucket {
  key: RiskSeverity;
  doc_count: number;
}

interface AggregationBucket {
  buckets?: AggBucket[];
}

export const kpiRiskScore: SecuritySolutionFactory<EntityRiskQueries.kpi> = {
  buildDsl: (options) => buildKpiRiskScoreQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<KpiRiskScoreStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildKpiRiskScoreQuery(options))],
    };

    const requestedEntities = (
      options.entities && options.entities.length > 0
        ? options.entities
        : options.entity
        ? [options.entity]
        : []
    ) as EntityType[];

    const supportedEntities = requestedEntities.filter(
      (entityType) => EntityTypeToLevelField[entityType] !== RiskScoreFields.unsupported
    );

    const entitiesToProcess = supportedEntities.length > 0 ? supportedEntities : requestedEntities;

    const accumulateBuckets = (
      accumulator: Record<RiskSeverity, number>,
      buckets: AggBucket[]
    ): Record<RiskSeverity, number> => {
      const result = { ...accumulator };
      buckets.forEach((bucket) => {
        const key = bucket.key;
        const currentTotal = result[key] ?? 0;
        const bucketValue = getOr(0, 'unique_entries.value', bucket);
        result[key] = currentTotal + bucketValue;
      });
      return result;
    };

    const rawAggregations = (
      response.rawResponse as {
        aggregations?: Record<string, AggregationBucket>;
      }
    ).aggregations;

    let aggregatedResult: Record<RiskSeverity, number> = {} as Record<RiskSeverity, number>;

    if (entitiesToProcess.length <= 1) {
      const riskBuckets = rawAggregations?.risk?.buckets ?? [];
      aggregatedResult = accumulateBuckets(aggregatedResult, riskBuckets);
    } else {
      entitiesToProcess.forEach((entityType) => {
        const buckets = rawAggregations?.[entityType]?.buckets ?? [];
        aggregatedResult = accumulateBuckets(aggregatedResult, buckets);
      });
    }

    return {
      ...response,
      kpiRiskScore: aggregatedResult,
      inspect,
    };
  },
};
