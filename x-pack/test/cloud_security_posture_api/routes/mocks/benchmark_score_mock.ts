/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const benchmarkScoreMockData = [
  {
    total_findings: 1,
    policy_template: 'cspm',
    '@timestamp': '2023-11-22T16:10:55.229268215Z',
    score_by_cluster_id: {
      'Another Upper case account id': {
        total_findings: 1,
        passed_findings: 1,
        failed_findings: 0,
      },
    },
    score_by_benchmark_id: {
      cis_gcp: {
        v2_0_0: {
          total_findings: 1196,
          passed_findings: 162,
          failed_findings: 1034,
        },
      },
      cis_azure: {
        v2_0_0: {
          total_findings: 132,
          passed_findings: 68,
          failed_findings: 64,
        },
      },
      cis_aws: {
        v1_5_0: {
          total_findings: 1,
          passed_findings: 1,
          failed_findings: 0,
        },
      },
    },
    passed_findings: 1,
    failed_findings: 0,
  },
];

export const complianceDashboardDataMock = {
  stats: {
    totalFailed: 0,
    totalPassed: 1,
    totalFindings: 1,
    postureScore: 100,
    resourcesEvaluated: 1,
  },
  groupedFindingsEvaluation: [
    {
      name: 'Another upper case section',
      totalFindings: 1,
      totalFailed: 0,
      totalPassed: 1,
      postureScore: 100,
    },
  ],
  clusters: [
    {
      meta: {
        clusterId: 'Another Upper case account id',
        assetIdentifierId: 'Another Upper case account id',
        benchmark: {
          name: 'CIS AWS2',
          id: 'cis_aws',
          posture_type: 'cspm',
          version: 'v1.5.0',
        },
        cloud: {
          account: {
            id: 'Another Upper case account id',
          },
        },
      },
      stats: {
        totalFailed: 0,
        totalPassed: 1,
        totalFindings: 1,
        postureScore: 100,
      },
      groupedFindingsEvaluation: [
        {
          name: 'Another upper case section',
          totalFindings: 1,
          totalFailed: 0,
          totalPassed: 1,
          postureScore: 100,
        },
      ],
      trend: [
        {
          totalFindings: 1,
          totalFailed: 0,
          totalPassed: 1,
          postureScore: 100,
        },
      ],
    },
  ],
  benchmarks: [
    {
      meta: {
        benchmarkId: 'cis_aws',
        benchmarkVersion: 'v1.5.0',
        benchmarkName: 'CIS AWS2',
        assetCount: 1,
      },
      stats: {
        totalFailed: 0,
        totalPassed: 1,
        totalFindings: 1,
        postureScore: 100,
      },
      groupedFindingsEvaluation: [
        {
          name: 'Another upper case section',
          totalFindings: 1,
          totalFailed: 0,
          totalPassed: 1,
          postureScore: 100,
        },
      ],
      trend: [
        {
          totalFindings: 1,
          totalFailed: 0,
          totalPassed: 1,
          postureScore: 100,
        },
      ],
    },
  ],
  trend: [
    {
      totalFindings: 1,
      totalFailed: 0,
      totalPassed: 1,
      postureScore: 100,
    },
  ],
};
