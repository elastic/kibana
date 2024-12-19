/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../common/constants';

import { Benchmark } from '../../../common/types/latest';
import { getClusters } from '../compliance_dashboard/get_clusters';
import { getStats } from '../compliance_dashboard/get_stats';
import { getSafePostureTypeRuntimeMapping } from '../../../common/runtime_mappings/get_safe_posture_type_runtime_mapping';
import { getMutedRulesFilterQuery } from '../benchmark_rules/get_states/v1';

export const getBenchmarksData = async (
  soClient: SavedObjectsClientContract,
  encryptedSoClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<Benchmark[]> => {
  // Returns a list of benchmark based on their Version and Benchmark ID

  const benchmarksResponse = await soClient.find<CspBenchmarkRule>({
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    aggs: {
      benchmark_id: {
        terms: {
          field: `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id`,
        },
        aggs: {
          name: {
            terms: {
              field: `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.name`,
            },
            aggs: {
              version: {
                terms: {
                  field: `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.version`,
                },
              },
            },
          },
        },
      },
    },
    perPage: 0,
  });

  const benchmarkAgg: any = benchmarksResponse.aggregations;
  const rulesFilter = await getMutedRulesFilterQuery(encryptedSoClient);

  const { id: pitId } = await esClient.openPointInTime({
    index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    keep_alive: '30s',
  });
  // Transform response to a benchmark row: {id, name, version}
  // For each Benchmark entry : Calculate Score, Get amount of enrolled agents
  const result = await Promise.all(
    benchmarkAgg.benchmark_id.buckets.flatMap(async (benchmark: any) => {
      const benchmarkId = benchmark.key;
      const benchmarkName = benchmark.name.buckets[0].key;

      const benchmarksTableObjects = await Promise.all(
        benchmark?.name?.buckets[0]?.version?.buckets.flatMap(async (benchmarkObj: any) => {
          const benchmarkVersion = benchmarkObj.key;
          const postureType =
            benchmarkId === 'cis_eks' || benchmarkId === 'cis_k8s' ? 'kspm' : 'cspm';
          const runtimeMappings: MappingRuntimeFields = getSafePostureTypeRuntimeMapping();
          const query: QueryDslQueryContainer = {
            bool: {
              filter: [
                { term: { 'rule.benchmark.id': benchmarkId } },
                { term: { 'rule.benchmark.version': benchmarkVersion } },
                { term: { safe_posture_type: postureType } },
              ],
              must_not: rulesFilter,
            },
          };
          const benchmarkScore = await getStats(esClient, query, pitId, runtimeMappings, logger);
          const benchmarkEvaluation = await getClusters(
            esClient,
            query,
            pitId,
            runtimeMappings,
            logger
          );

          return {
            id: benchmarkId,
            name: benchmarkName,
            version: benchmarkVersion.replace('v', ''),
            score: benchmarkScore,
            evaluation: benchmarkEvaluation.length,
          };
        })
      );

      return benchmarksTableObjects;
    })
  );
  return result.flat();
};

export const getBenchmarks = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  encryptedSoClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const benchmarks = await getBenchmarksData(soClient, encryptedSoClient, esClient, logger);
  const getBenchmarkResponse = {
    items: benchmarks,
  };
  return getBenchmarkResponse;
};
