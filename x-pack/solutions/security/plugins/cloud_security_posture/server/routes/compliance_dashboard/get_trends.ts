/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { calculatePostureScore } from '../../../common/utils/helpers';
import { BENCHMARK_SCORE_INDEX_DEFAULT_NS } from '../../../common/constants';
import type { PosturePolicyTemplate, Stats } from '../../../common/types_old';
import { toBenchmarkDocFieldKey } from '../../lib/mapping_field_util';

interface FindingsDetails {
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
}

interface ScoreByClusterId {
  [clusterId: string]: FindingsDetails;
}

interface ScoreByBenchmarkId {
  [benchmarkId: string]: {
    [key: string]: FindingsDetails;
  };
}

export interface ScoreTrendDoc {
  '@timestamp': string;
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
  score_by_cluster_id: ScoreByClusterId;
  score_by_benchmark_id: ScoreByBenchmarkId;
}

export type TrendsDetails = Array<{
  timestamp: string;
  summary: Stats;
  clusters: Record<string, Stats>;
  benchmarks: Record<string, Stats>;
}>;

export interface Trends {
  trends: TrendsDetails;
  namespaces: string[];
}
export interface ScoreTrendAggregateResponse {
  by_namespace: {
    buckets: Array<{
      key: string; // namespace name, e.g., "default"
      doc_count: number;
      all_scores: {
        hits: {
          hits: Array<{
            _source: {
              '@timestamp': string;
              total_findings: number;
              passed_findings: number;
              failed_findings: number;
              score_by_cluster_id: ScoreByClusterId;
              score_by_benchmark_id: ScoreByBenchmarkId;
            };
          }>;
        };
      };
    }>;
  };
}
export const getTrendsQuery = (policyTemplate: PosturePolicyTemplate): SearchRequest => ({
  index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  size: 0,
  sort: '@timestamp:desc',
  query: {
    bool: {
      filter: [{ term: { policy_template: policyTemplate } }],
      must: [
        {
          range: {
            '@timestamp': {
              gte: 'now-1d',
              lte: 'now',
            },
          },
        },
        {
          term: { is_enabled_rules_score: true },
        },
      ],
    },
  },
  aggs: {
    by_namespace: {
      terms: {
        field: 'namespace',
      },
      aggs: {
        all_scores: {
          top_hits: {
            size: 100, // size: 100, // Maximum top hits result window is 100 which represents > 8 hours of scores samples (CSPM_FINDINGS_STATS_INTERVAL)
            sort: [{ '@timestamp': { order: 'desc' } }],
            _source: {
              includes: [
                '@timestamp',
                'total_findings',
                'passed_findings',
                'failed_findings',
                'score_by_cluster_id',
                'score_by_benchmark_id',
              ],
            },
          },
        },
      },
    },
  },
});

export const formatTrends = (scoreTrendDocs: ScoreTrendDoc[]): TrendsDetails => {
  return scoreTrendDocs.map((data) => {
    return {
      timestamp: data['@timestamp'],
      summary: {
        totalFindings: data.total_findings,
        totalFailed: data.failed_findings,
        totalPassed: data.passed_findings,
        postureScore: calculatePostureScore(data.passed_findings, data.failed_findings),
      },
      clusters: Object.fromEntries(
        Object.entries(data.score_by_cluster_id).map(([clusterId, cluster]) => [
          clusterId,
          {
            totalFindings: cluster.total_findings,
            totalFailed: cluster.failed_findings,
            totalPassed: cluster.passed_findings,
            postureScore: calculatePostureScore(cluster.passed_findings, cluster.failed_findings),
          },
        ])
      ),
      benchmarks: data.score_by_benchmark_id
        ? Object.fromEntries(
            Object.entries(data.score_by_benchmark_id).flatMap(([benchmarkId, benchmark]) =>
              Object.entries(benchmark).map(([benchmarkVersion, benchmarkStats]) => {
                const benchmarkIdVersion = toBenchmarkDocFieldKey(benchmarkId, benchmarkVersion);
                return [
                  benchmarkIdVersion,
                  {
                    totalFindings: benchmarkStats.total_findings,
                    totalFailed: benchmarkStats.failed_findings,
                    totalPassed: benchmarkStats.passed_findings,
                    postureScore: calculatePostureScore(
                      benchmarkStats.passed_findings,
                      benchmarkStats.failed_findings
                    ),
                  },
                ];
              })
            )
          )
        : {},
    };
  });
};

export const getTrends = async (
  esClient: ElasticsearchClient,
  policyTemplate: PosturePolicyTemplate,
  logger: Logger,
  namespace: string = DEFAULT_NAMESPACE_STRING
): Promise<Trends> => {
  try {
    const trendsQueryResult = await esClient.search<unknown, ScoreTrendAggregateResponse>(
      getTrendsQuery(policyTemplate)
    );
    if (!trendsQueryResult.aggregations?.by_namespace?.buckets)
      throw new Error('missing trend results from score index');

    const scoreTrendDocs =
      trendsQueryResult.aggregations.by_namespace.buckets.map((bucket) => {
        const namespaceKey = bucket.key;
        const documents = bucket.all_scores?.hits?.hits?.map((hit) => hit._source) || [];
        return { [namespaceKey]: { documents } };
      }) ?? [];

    if (!scoreTrendDocs.length) return { trends: [], namespaces: [] }; // No trends data available

    const namespacedData = Object.fromEntries(
      scoreTrendDocs.map((entry) => {
        const [key, value] = Object.entries(entry)[0];
        return [key, value.documents];
      })
    );

    const namespaceKeys = Object.keys(namespacedData);

    if (!namespacedData[namespace]) {
      logger.warn(`Namespace '${namespace}' not found in trend results.`);
      return { trends: [], namespaces: namespaceKeys };
    }

    return { trends: formatTrends(namespacedData[namespace]), namespaces: namespaceKeys };
  } catch (err) {
    logger.error(`Failed to fetch trendlines data ${err.message}`);
    logger.error(err);
    throw err;
  }
};
