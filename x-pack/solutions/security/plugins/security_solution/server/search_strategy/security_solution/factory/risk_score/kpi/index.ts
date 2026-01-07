/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';

import type { EntityRiskQueries } from '../../../../../../common/api/search_strategy';
import type { KpiRiskScoreStrategyResponse } from '../../../../../../common/search_strategy';
import { RiskSeverity } from '../../../../../../common/search_strategy';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildKpiRiskScoreQuery } from './query.kpi_risk_score.dsl';

interface AggBucket {
  key: RiskSeverity;
  doc_count: number;
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

    // Support both single entity and array of entities
    const entities = Array.isArray(options.entity) ? options.entity : [options.entity];

    // Combine results from all entity aggregations
    const result: Record<RiskSeverity, number> = {
      [RiskSeverity.Unknown]: 0,
      [RiskSeverity.Low]: 0,
      [RiskSeverity.Moderate]: 0,
      [RiskSeverity.High]: 0,
      [RiskSeverity.Critical]: 0,
    };

    entities.forEach((entityType) => {
      const entityAggKey = entityType as string;
      const riskBuckets = getOr([], `aggregations.${entityAggKey}.buckets`, response.rawResponse);

      riskBuckets.forEach((bucket: AggBucket) => {
        const severity = bucket.key as RiskSeverity;
        const count = getOr(0, 'unique_entries.value', bucket);
        result[severity] += count;
      });
    });

    return {
      ...response,
      kpiRiskScore: result,
      inspect,
    };
  },
};
