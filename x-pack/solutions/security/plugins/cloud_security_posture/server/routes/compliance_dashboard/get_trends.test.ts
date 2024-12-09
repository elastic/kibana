/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatTrends, ScoreTrendDoc } from './get_trends';

const trendDocs: ScoreTrendDoc[] = [
  {
    '@timestamp': '2022-04-06T15:30:00Z',
    total_findings: 20,
    passed_findings: 5,
    failed_findings: 15,
    score_by_cluster_id: {
      first_cluster_id: {
        total_findings: 20,
        passed_findings: 5,
        failed_findings: 15,
      },
    },
    score_by_benchmark_id: {
      cis_gcp: {
        v2_0_0: {
          total_findings: 6,
          passed_findings: 3,
          failed_findings: 3,
        },
      },
    },
  },
  {
    '@timestamp': '2022-04-06T15:00:00Z',
    total_findings: 40,
    passed_findings: 25,
    failed_findings: 15,
    score_by_cluster_id: {
      second_cluster_id: {
        total_findings: 20,
        passed_findings: 10,
        failed_findings: 10,
      },
      third_cluster_id: {
        total_findings: 20,
        passed_findings: 15,
        failed_findings: 5,
      },
    },
    score_by_benchmark_id: {
      cis_gcp: {
        v2_0_0: {
          total_findings: 6,
          passed_findings: 3,
          failed_findings: 3,
        },
      },
      cis_azure: {
        v2_0_0: {
          total_findings: 6,
          passed_findings: 3,
          failed_findings: 3,
        },
      },
      cis_aws: {
        v1_5_0: {
          total_findings: 6,
          passed_findings: 3,
          failed_findings: 3,
        },
      },
    },
  },
];

describe('getTrendsFromQueryResult', () => {
  it('should return value matching Trends type definition, in descending order, and with postureScore', async () => {
    const trends = formatTrends(trendDocs);
    expect(trends).toEqual([
      {
        timestamp: '2022-04-06T15:30:00Z',
        summary: {
          totalFindings: 20,
          totalPassed: 5,
          totalFailed: 15,
          postureScore: 25.0,
        },
        clusters: {
          first_cluster_id: {
            totalFindings: 20,
            totalPassed: 5,
            totalFailed: 15,
            postureScore: 25.0,
          },
        },
        benchmarks: {
          'cis_gcp;v2.0.0': {
            totalFailed: 3,
            totalFindings: 6,
            totalPassed: 3,
            postureScore: 50,
          },
        },
      },
      {
        timestamp: '2022-04-06T15:00:00Z',
        summary: {
          totalFindings: 40,
          totalPassed: 25,
          totalFailed: 15,
          postureScore: 62.5,
        },
        clusters: {
          second_cluster_id: {
            totalFindings: 20,
            totalPassed: 10,
            totalFailed: 10,
            postureScore: 50.0,
          },
          third_cluster_id: {
            totalFindings: 20,
            totalPassed: 15,
            totalFailed: 5,
            postureScore: 75.0,
          },
        },
        benchmarks: {
          'cis_gcp;v2.0.0': {
            totalFailed: 3,
            totalFindings: 6,
            totalPassed: 3,
            postureScore: 50.0,
          },
          'cis_azure;v2.0.0': {
            totalFailed: 3,
            totalFindings: 6,
            totalPassed: 3,
            postureScore: 50.0,
          },
          'cis_aws;v1.5.0': {
            totalFailed: 3,
            totalFindings: 6,
            totalPassed: 3,
            postureScore: 50.0,
          },
        },
      },
    ]);
  });
});
