/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CloudDefendPodsStats } from './types';
import { LOGS_CLOUD_DEFEND_PATTERN } from '../../../../common/constants';

interface PodsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}

interface Bucket {
  key: string;
}

export interface AccountEntity {
  key: string; // orchestrator.cluster.id
  doc_count: number;
  pods: {
    buckets: Pod[];
  };
}

interface Pod {
  key: string; // orchestrator.resource.name
  container_image_name: {
    buckets: Bucket[];
  };
  container_image_tag: {
    buckets: Bucket[];
  };
  doc_count: number;
  file_doc_count: {
    doc_count: number;
  };
  process_doc_count: {
    doc_count: number;
  };
  alert_doc_count: {
    doc_count: number;
  };
}

const getPodsStatsQuery = (index: string): SearchRequest => ({
  index,
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
        // all cloud-defend logs are from the viewpoint of an orchestrator.resource.type = "pod"
        // so no need to filter by orchestrator.resource.type.
        pods: {
          terms: {
            field: 'orchestrator.resource.name',
            order: {
              _count: 'desc',
            },
            size: 100,
          },
          aggs: {
            container_image_name: {
              terms: {
                field: 'container.image.name',
                size: 1,
              },
            },
            container_image_tag: {
              terms: {
                field: 'container.image.tag',
                size: 1,
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
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getCloudDefendPodsStats = (
  aggregatedPodsStats: PodsStats,
  logger: Logger
): CloudDefendPodsStats[] => {
  const accounts = aggregatedPodsStats.accounts.buckets;
  const podsStats = accounts.map((account) => {
    const accountId = account.key;
    return account.pods.buckets.map((pod) => {
      return {
        account_id: accountId,
        pod_name: pod.key,
        container_image_name: pod.container_image_name?.buckets?.[0]?.key,
        container_image_tag: pod.container_image_tag?.buckets?.[0]?.key,
        total_doc_count: pod.doc_count,
        file_doc_count: pod.file_doc_count.doc_count,
        process_doc_count: pod.process_doc_count.doc_count,
        alert_doc_count: pod.alert_doc_count.doc_count,
      };
    });
  });
  logger.info('Cloud defend telemetry: pods stats was sent');

  return podsStats.flat(2);
};

export const getPodsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudDefendPodsStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LOGS_CLOUD_DEFEND_PATTERN,
    });

    if (isIndexExists) {
      const podsStatsResponse = await esClient.search<unknown, PodsStats>(
        getPodsStatsQuery(LOGS_CLOUD_DEFEND_PATTERN)
      );

      const cloudDefendPodsStats = podsStatsResponse.aggregations
        ? getCloudDefendPodsStats(podsStatsResponse.aggregations, logger)
        : [];

      return cloudDefendPodsStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get pods stats ${e}`);
    return [];
  }
};
