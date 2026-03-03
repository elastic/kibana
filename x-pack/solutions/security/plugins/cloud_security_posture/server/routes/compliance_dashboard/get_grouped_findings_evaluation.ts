/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  OpenPointInTimeResponse,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { calculatePostureScore } from '../../../common/utils/helpers';
import type { ComplianceDashboardData } from '../../../common/types_old';
import type { KeyDocCount } from './compliance_dashboard';

export interface FailedFindingsQueryResult {
  aggs_by_resource_type: Aggregation<PostureStatsBucket>;
}

export interface BenchmarkVersionQueryResult extends KeyDocCount, FailedFindingsQueryResult {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  asset_count: {
    value: number;
  };
  aggs_by_benchmark_name: Aggregation<KeyDocCount>;
}

export interface PostureStatsBucket extends KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  score: { value: number };
}

export const failedFindingsAggQuery = {
  aggs_by_resource_type: {
    terms: {
      field: 'rule.section',
      size: 5,
    },
    aggs: {
      failed_findings: {
        filter: { term: { 'result.evaluation': 'failed' } },
      },
      passed_findings: {
        filter: { term: { 'result.evaluation': 'passed' } },
      },
      score: {
        bucket_script: {
          buckets_path: {
            passed: 'passed_findings>_count',
            failed: 'failed_findings>_count',
          },
          script: 'params.passed / (params.passed + params.failed)',
        },
      },
      sort_by_score: {
        bucket_sort: {
          sort: {
            score: 'asc' as 'asc',
          },
        },
      },
    },
  },
};

export const getRisksEsQuery = (
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): SearchRequest => ({
  size: 0,
  // creates the `safe_posture_type` runtime fields,
  // `safe_posture_type` is used by the `query` to filter by posture type for older findings without this field
  runtime_mappings: runtimeMappings,
  query,
  aggs: failedFindingsAggQuery,
  pit: {
    id: pitId,
  },
});

export const getPostureStatsFromAggs = (
  queryResult: PostureStatsBucket[]
): ComplianceDashboardData['groupedFindingsEvaluation'] =>
  queryResult.map((bucket) => {
    const totalPassed = bucket.passed_findings.doc_count || 0;
    const totalFailed = bucket.failed_findings.doc_count || 0;

    return {
      name: bucket.key,
      totalFindings: bucket.doc_count,
      totalFailed,
      totalPassed,
      postureScore: calculatePostureScore(totalPassed, totalFailed),
    };
  });

export const getGroupedFindingsEvaluation = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pit: OpenPointInTimeResponse,
  runtimeMappings: MappingRuntimeFields,
  logger: Logger
): Promise<ComplianceDashboardData['groupedFindingsEvaluation']> => {
  try {
    const resourceTypesQueryResult = await esClient.search<unknown, FailedFindingsQueryResult>(
      getRisksEsQuery(query, pit.id, runtimeMappings)
    );

    if (resourceTypesQueryResult.pit_id) {
      pit.id = resourceTypesQueryResult.pit_id;
    }

    const ruleSections = resourceTypesQueryResult.aggregations?.aggs_by_resource_type.buckets;
    if (!Array.isArray(ruleSections)) {
      return [];
    }

    return getPostureStatsFromAggs(ruleSections);
  } catch (err) {
    logger.error(`Failed to fetch findings stats ${err.message}`);
    logger.error(err);
    throw err;
  }
};
