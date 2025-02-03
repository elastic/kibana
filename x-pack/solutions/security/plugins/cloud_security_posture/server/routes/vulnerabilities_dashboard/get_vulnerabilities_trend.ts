/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { BENCHMARK_SCORE_INDEX_DEFAULT_NS } from '../../../common/constants';
import { VulnStatsTrend } from '../../../common/types_old';

interface LastDocBucket {
  key_as_string: string;
  last_doc: {
    hits: {
      hits: Array<{
        _source: VulnStatsTrend;
      }>;
    };
  };
}

interface VulnStatsTrendResponse {
  vuln_severity_per_day: {
    buckets: LastDocBucket[];
  };
}

export const getVulnTrendsQuery = () => ({
  index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  size: 0,
  query: {
    bool: {
      must: [
        {
          term: {
            policy_template: 'vuln_mgmt',
          },
        },
        {
          range: {
            '@timestamp': {
              gte: 'now-30d',
              lte: 'now',
              format: 'strict_date_optional_time',
            },
          },
        },
      ],
    },
  },
  aggs: {
    vuln_severity_per_day: {
      date_histogram: {
        field: '@timestamp',
        calendar_interval: '1d',
        order: {
          _key: 'asc',
        },
      },
      aggs: {
        last_doc: {
          top_hits: {
            size: 1,
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
          },
        },
      },
    },
  },
});

export const getVulnerabilitiesTrends = async (
  esClient: ElasticsearchClient
): Promise<VulnStatsTrend[]> => {
  const vulnTrendsQueryResult = await esClient.search<LastDocBucket, VulnStatsTrendResponse>(
    getVulnTrendsQuery()
  );
  if (!vulnTrendsQueryResult.hits.hits) {
    throw new Error('Missing trend results from score index');
  }

  const vulnStatsTrendDocs = vulnTrendsQueryResult.aggregations?.vuln_severity_per_day.buckets?.map(
    (bucket) => bucket.last_doc.hits.hits[0]._source
  );

  return vulnStatsTrendDocs || [];
};
