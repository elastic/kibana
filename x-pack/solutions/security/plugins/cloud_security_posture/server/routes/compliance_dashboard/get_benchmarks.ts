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
import type { BenchmarkData } from '../../../common/types_old';
import type { BenchmarkVersionQueryResult } from './get_grouped_findings_evaluation';
import { failedFindingsAggQuery, getPostureStatsFromAggs } from './get_grouped_findings_evaluation';
import { findingsEvaluationAggsQuery, getStatsFromFindingsEvaluationsAggs } from './get_stats';
import type { KeyDocCount } from './compliance_dashboard';
import { getIdentifierRuntimeMapping } from '../../../common/runtime_mappings/get_identifier_runtime_mapping';

export interface BenchmarkBucket extends KeyDocCount {
  aggs_by_benchmark_version: Aggregation<BenchmarkVersionQueryResult>;
}

interface BenchmarkQueryResult extends KeyDocCount {
  aggs_by_benchmark: Aggregation<BenchmarkBucket>;
}

export type BenchmarkWithoutTrend = Omit<BenchmarkData, 'trend'>;

const MAX_BENCHMARKS = 500;

export const getBenchmarksQuery = (
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): SearchRequest => ({
  size: 0,
  runtime_mappings: { ...runtimeMappings, ...getIdentifierRuntimeMapping() },
  query,
  aggs: {
    aggs_by_benchmark: {
      terms: {
        field: 'rule.benchmark.id',
        order: {
          _count: 'desc',
        },
        size: MAX_BENCHMARKS,
      },
      aggs: {
        aggs_by_benchmark_version: {
          terms: {
            field: 'rule.benchmark.version',
          },
          aggs: {
            aggs_by_benchmark_name: {
              terms: {
                field: 'rule.benchmark.name',
              },
            },
            asset_count: {
              cardinality: {
                field: 'asset_identifier',
              },
            },
            // Result evalution for passed or failed findings
            ...findingsEvaluationAggsQuery,
            // CIS Section Compliance Score and Failed Findings
            ...failedFindingsAggQuery,
          },
        },
      },
    },
  },
  pit: {
    id: pitId,
  },
});

export const getBenchmarksFromAggs = (benchmarks: BenchmarkBucket[]) => {
  return benchmarks.flatMap((benchmarkAggregation: BenchmarkBucket) => {
    const benchmarkId = benchmarkAggregation.key;
    const versions = benchmarkAggregation.aggs_by_benchmark_version.buckets;
    if (!Array.isArray(versions)) throw new Error('missing aggs by benchmark version');

    return versions.map((version: BenchmarkVersionQueryResult) => {
      const benchmarkVersion = version.key;
      const assetCount = version.asset_count.value;
      const resourcesTypesAggs = version.aggs_by_resource_type.buckets;

      let benchmarkName = '';

      if (!Array.isArray(version.aggs_by_benchmark_name.buckets))
        throw new Error('missing aggs by benchmark name');

      if (version.aggs_by_benchmark_name && version.aggs_by_benchmark_name.buckets.length > 0) {
        benchmarkName = version.aggs_by_benchmark_name.buckets[0].key;
      }

      if (!Array.isArray(resourcesTypesAggs))
        throw new Error('missing aggs by resource type per benchmark');

      const { passed_findings: passedFindings, failed_findings: failedFindings } = version;
      const stats = getStatsFromFindingsEvaluationsAggs({
        passed_findings: passedFindings,
        failed_findings: failedFindings,
      });

      const groupedFindingsEvaluation = getPostureStatsFromAggs(resourcesTypesAggs);

      return {
        meta: {
          benchmarkId,
          benchmarkVersion,
          benchmarkName,
          assetCount,
        },
        stats,
        groupedFindingsEvaluation,
      };
    });
  });
};

export const getBenchmarks = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pit: OpenPointInTimeResponse,
  runtimeMappings: MappingRuntimeFields,
  logger: Logger
): Promise<BenchmarkWithoutTrend[]> => {
  try {
    const queryResult = await esClient.search<unknown, BenchmarkQueryResult>(
      getBenchmarksQuery(query, pit.id, runtimeMappings)
    );

    if (queryResult.pit_id) {
      pit.id = queryResult.pit_id;
    }

    const benchmarks = queryResult.aggregations?.aggs_by_benchmark.buckets;
    if (!Array.isArray(benchmarks)) throw new Error('missing aggs by benchmark id');

    return getBenchmarksFromAggs(benchmarks);
  } catch (err) {
    logger.error(`Failed to fetch benchmark stats ${err.message}`);
    logger.error(err);
    throw err;
  }
};
