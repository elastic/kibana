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
import type { CloudDefendAccountsStats } from './types';
import { LOGS_CLOUD_DEFEND_PATTERN } from '../../../../common/constants';

interface Value {
  value: number;
}

interface KubernetesVersion {
  metrics: { 'orchestrator.version': string };
}

interface CloudProvider {
  metrics: { 'cloud.provider': string };
}

interface AccountsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}
interface AccountEntity {
  key: string; // aggregation bucket key (currently: orchestrator.cluster.id)
  doc_count: number; // total doc count (process + file + alerts)
  process_doc_count: AggregationsMultiBucketBase;
  file_doc_count: AggregationsMultiBucketBase;
  alert_doc_count: AggregationsMultiBucketBase;
  cloud_provider: { top: CloudProvider[] };
  kubernetes_version: { top: KubernetesVersion[] };
  agents_count: Value;
  nodes_count: Value;
  pods_count: Value;
  resources: {
    pods_count: Value;
  };
}

const getAccountsStatsQuery = (): SearchRequest => ({
  index: LOGS_CLOUD_DEFEND_PATTERN,
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'orchestrator.cluster.id',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
        nodes_count: {
          cardinality: {
            field: 'cloud.instance.name',
          },
        },
        agents_count: {
          cardinality: {
            field: 'agent.id',
          },
        },
        kubernetes_version: {
          top_metrics: {
            metrics: {
              field: 'orchestrator.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        cloud_provider: {
          top_metrics: {
            metrics: {
              field: 'cloud.provider',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        file_doc_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'event.category': 'file',
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
        process_doc_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'event.category': 'process',
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
        alert_doc_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'event.kind': 'alert',
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
        pods_count: {
          cardinality: {
            field: 'orchestrator.resource.name',
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getCloudDefendAccountsStats = (
  aggregatedResourcesStats: AccountsStats,
  logger: Logger
): CloudDefendAccountsStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const cloudDefendAccountsStats = accounts.map((account) => ({
    account_id: account.key,
    total_doc_count: account.doc_count,
    file_doc_count: account.file_doc_count.doc_count,
    process_doc_count: account.process_doc_count.doc_count,
    alert_doc_count: account.alert_doc_count.doc_count,
    kubernetes_version: account.kubernetes_version?.top?.[0]?.metrics['orchestrator.version'],
    cloud_provider: account.cloud_provider?.top?.[0]?.metrics['cloud.provider'],
    agents_count: account.agents_count.value,
    nodes_count: account.nodes_count.value,
    pods_count: account.pods_count.value,
  }));
  logger.info('CloudDefend telemetry: accounts stats was sent');

  return cloudDefendAccountsStats;
};

export const getAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudDefendAccountsStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LOGS_CLOUD_DEFEND_PATTERN,
    });

    if (isIndexExists) {
      const accountsStatsResponse = await esClient.search<unknown, AccountsStats>(
        getAccountsStatsQuery()
      );

      const cloudDefendAccountsStats = accountsStatsResponse.aggregations
        ? getCloudDefendAccountsStats(accountsStatsResponse.aggregations, logger)
        : [];

      return cloudDefendAccountsStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get account stats ${e}`);
    return [];
  }
};
