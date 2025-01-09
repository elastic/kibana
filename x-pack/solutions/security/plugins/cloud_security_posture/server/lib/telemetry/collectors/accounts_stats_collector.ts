/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type {
  AggregationsMultiBucketBase,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { getIdentifierRuntimeMapping } from '../../../../common/runtime_mappings/get_identifier_runtime_mapping';
import { calculatePostureScore } from '../../../../common/utils/helpers';
import type { CspmAccountsStats } from './types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';

interface Value {
  value: number;
}
interface BenchmarkName {
  metrics: { 'rule.benchmark.name': string };
}

interface BenchmarkId {
  metrics: { 'rule.benchmark.id': string };
}

interface BenchmarkVersion {
  metrics: { 'rule.benchmark.version': string };
}

interface KubernetesVersion {
  metrics: { 'cloudbeat.kubernetes.version': string };
}

interface AccountsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}
interface AccountEntity {
  key: string; // account_id
  doc_count: number; // latest findings doc count
  passed_findings_count: AggregationsMultiBucketBase;
  failed_findings_count: AggregationsMultiBucketBase;
  benchmark_name: { top: BenchmarkName[] };
  benchmark_id: { top: BenchmarkId[] };
  benchmark_version: { top: BenchmarkVersion[] };
  kubernetes_version: { top: KubernetesVersion[] };
  agents_count: Value;
  nodes_count: Value;
  pods_count: Value;
  resources: {
    pods_count: Value;
  };
}

const getAccountsStatsQuery = (): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  runtime_mappings: getIdentifierRuntimeMapping(),
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'asset_identifier',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
        nodes_count: {
          cardinality: {
            field: 'host.name',
          },
        },
        agents_count: {
          cardinality: {
            field: 'agent.id',
          },
        },
        benchmark_id: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.id',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_version: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_name: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.name',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        kubernetes_version: {
          top_metrics: {
            metrics: {
              field: 'cloudbeat.kubernetes.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        passed_findings_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'result.evaluation': 'passed',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        failed_findings_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'result.evaluation': 'failed',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        resources: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'resource.sub_type': 'Pod',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          aggs: {
            pods_count: {
              cardinality: {
                field: 'resource.id',
              },
            },
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getCspmAccountsStats = (
  aggregatedResourcesStats: AccountsStats,
  logger: Logger
): CspmAccountsStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const cspmAccountsStats = accounts.map((account) => ({
    account_id: account.key,
    latest_findings_doc_count: account.doc_count,
    posture_score: calculatePostureScore(
      account.passed_findings_count.doc_count,
      account.failed_findings_count.doc_count
    ),
    passed_findings_count: account.passed_findings_count.doc_count,
    failed_findings_count: account.failed_findings_count.doc_count,
    benchmark_name: account.benchmark_name.top[0].metrics['rule.benchmark.name'],
    benchmark_id: account.benchmark_id.top[0].metrics['rule.benchmark.id'],
    benchmark_version: account.benchmark_version.top[0].metrics['rule.benchmark.version'],
    kubernetes_version: account.kubernetes_version.top[0].metrics['cloudbeat.kubernetes.version'],
    agents_count: account.agents_count.value,
    nodes_count: account.nodes_count.value,
    pods_count: account.resources.pods_count.value,
  }));

  return cspmAccountsStats;
};

export const getAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CspmAccountsStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isIndexExists) {
      const accountsStatsResponse = await esClient.search<unknown, AccountsStats>(
        getAccountsStatsQuery()
      );

      const cspmAccountsStats = accountsStatsResponse.aggregations
        ? getCspmAccountsStats(accountsStatsResponse.aggregations, logger)
        : [];

      return cspmAccountsStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get account stats ${e}`);
    return [];
  }
};
