/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  OpenPointInTimeResponse,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { calculatePostureScore } from '../../../common/utils/helpers';
import type { ComplianceDashboardData } from '../../../common/types_old';

export interface FindingsEvaluationsQueryResult {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  resources_evaluated?: {
    value: number;
  };
}

export const findingsEvaluationAggsQuery = {
  failed_findings: {
    filter: { term: { 'result.evaluation': 'failed' } },
  },
  passed_findings: {
    filter: { term: { 'result.evaluation': 'passed' } },
  },
};

const uniqueResourcesCountQuery = {
  resources_evaluated: {
    cardinality: {
      field: 'resource.id',
    },
  },
};

export const getEvaluationsQuery = (
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): SearchRequest => ({
  size: 0,
  // creates the `safe_posture_type` runtime fields,
  // `safe_posture_type` is used by the `query` to filter by posture type for older findings without this field
  runtime_mappings: runtimeMappings,
  query,
  aggs: {
    ...findingsEvaluationAggsQuery,
    ...uniqueResourcesCountQuery,
  },
  pit: {
    id: pitId,
  },
});

export const getStatsFromFindingsEvaluationsAggs = (
  findingsEvaluationsAggs: FindingsEvaluationsQueryResult
): ComplianceDashboardData['stats'] => {
  const resourcesEvaluated = findingsEvaluationsAggs.resources_evaluated?.value;
  const failedFindings = findingsEvaluationsAggs.failed_findings.doc_count || 0;
  const passedFindings = findingsEvaluationsAggs.passed_findings.doc_count || 0;
  const totalFindings = failedFindings + passedFindings;
  const postureScore = calculatePostureScore(passedFindings, failedFindings) || 0;

  return {
    totalFailed: failedFindings,
    totalPassed: passedFindings,
    totalFindings,
    postureScore,
    ...(resourcesEvaluated && { resourcesEvaluated }),
  };
};

export const getStats = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pit: OpenPointInTimeResponse,
  runtimeMappings: MappingRuntimeFields,
  logger: Logger
): Promise<ComplianceDashboardData['stats']> => {
  try {
    const evaluationsQueryResult = await esClient.search<unknown, FindingsEvaluationsQueryResult>(
      getEvaluationsQuery(query, pit.id, runtimeMappings)
    );

    if (evaluationsQueryResult.pit_id) {
      pit.id = evaluationsQueryResult.pit_id;
    }

    const findingsEvaluations = evaluationsQueryResult.aggregations;
    if (!findingsEvaluations) throw new Error('missing findings evaluations');

    return getStatsFromFindingsEvaluationsAggs(findingsEvaluations);
  } catch (err) {
    logger.error(`Failed to fetch stats ${err.message}`);
    logger.error(err);
    throw err;
  }
};
