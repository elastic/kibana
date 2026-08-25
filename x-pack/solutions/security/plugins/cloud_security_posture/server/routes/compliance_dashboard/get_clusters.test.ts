/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClusterBucket } from './get_clusters';
import { getClustersFromAggs, getClustersQuery } from './get_clusters';

const mockClusterBuckets: ClusterBucket[] = [
  {
    key: 'cluster_id',
    doc_count: 10,
    latestFindingTopHit: {
      hits: {
        hits: [
          {
            _id: '123',
            _index: '123',
            _source: {
              orchestrator: {
                cluster: {
                  name: 'cluster_name',
                },
              },
              rule: { benchmark: { name: 'CIS Kubernetes', id: 'cis_k8s' } },
              '@timestamp': '123',
            },
          },
        ],
      },
    },
    failed_findings: {
      doc_count: 6,
    },
    passed_findings: {
      doc_count: 6,
    },
    aggs_by_resource_type: {
      buckets: [
        {
          key: 'foo_type',
          doc_count: 6,
          failed_findings: {
            doc_count: 3,
          },
          passed_findings: {
            doc_count: 3,
          },
          score: {
            value: 0.5,
          },
        },
        {
          key: 'boo_type',
          doc_count: 6,
          failed_findings: {
            doc_count: 3,
          },
          passed_findings: {
            doc_count: 3,
          },
          score: {
            value: 0.5,
          },
        },
      ],
    },
  },
];

describe('getClustersQuery', () => {
  it('restricts top_hits _source to only the fields consumed by getClustersFromAggs', () => {
    const query = getClustersQuery({}, 'pit-id', {});
    const topHits = (query.aggs as any)?.aggs_by_asset_identifier?.aggs?.latestFindingTopHit
      ?.top_hits;
    expect(topHits?._source).toEqual({
      includes: ['@timestamp', 'rule.benchmark', 'cloud', 'orchestrator.cluster'],
    });
  });
});

describe('getClustersFromAggs', () => {
  it('should return value matching ComplianceDashboardData["clusters"]', async () => {
    const clusters = getClustersFromAggs(mockClusterBuckets);
    expect(clusters).toEqual([
      {
        meta: {
          lastUpdate: '123',
          clusterId: 'cluster_id',
          assetIdentifierId: 'cluster_id',
          benchmark: { name: 'CIS Kubernetes', id: 'cis_k8s' },
          cloud: undefined,
          cluster: {
            name: 'cluster_name',
          },
        },
        stats: {
          totalFindings: 12,
          totalFailed: 6,
          totalPassed: 6,
          postureScore: 50.0,
        },
        groupedFindingsEvaluation: [
          {
            name: 'foo_type',
            totalFindings: 6,
            totalFailed: 3,
            totalPassed: 3,
            postureScore: 50.0,
          },
          {
            name: 'boo_type',
            totalFindings: 6,
            totalFailed: 3,
            totalPassed: 3,
            postureScore: 50.0,
          },
        ],
      },
    ]);
  });
});
