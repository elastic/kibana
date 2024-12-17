/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BenchmarkBucket, getBenchmarksFromAggs } from './get_benchmarks';

const mockBenchmarkBuckets: BenchmarkBucket[] = [
  {
    key: 'cis_aws',
    doc_count: 12,
    aggs_by_benchmark_version: {
      buckets: [
        {
          key: 'v1.5.0',
          doc_count: 12,
          asset_count: {
            value: 1,
          },
          aggs_by_resource_type: {
            buckets: [
              {
                key: 'foo_type',
                doc_count: 6,
                passed_findings: {
                  doc_count: 3,
                },
                failed_findings: {
                  doc_count: 3,
                },
                score: {
                  value: 0.5,
                },
              },
              {
                key: 'boo_type',
                doc_count: 6,
                passed_findings: {
                  doc_count: 3,
                },
                failed_findings: {
                  doc_count: 3,
                },
                score: {
                  value: 0.5,
                },
              },
            ],
          },
          aggs_by_benchmark_name: {
            buckets: [
              {
                key: 'CIS Amazon Web Services Foundations',
                doc_count: 12,
              },
            ],
          },
          passed_findings: {
            doc_count: 6,
          },
          failed_findings: {
            doc_count: 6,
          },
        },
      ],
    },
  },
];

describe('getBenchmarksFromAggs', () => {
  it('should return value matching ComplianceDashboardDataV2["benchmarks"]', async () => {
    const benchmarks = getBenchmarksFromAggs(mockBenchmarkBuckets);
    expect(benchmarks).toEqual([
      {
        meta: {
          benchmarkId: 'cis_aws',
          benchmarkVersion: 'v1.5.0',
          benchmarkName: 'CIS Amazon Web Services Foundations',
          assetCount: 1,
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
