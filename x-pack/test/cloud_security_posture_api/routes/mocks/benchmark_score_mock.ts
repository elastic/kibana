/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getBenchmarkScoreMockData = (postureType: string, isEnabledRulesScore: boolean) => [
  {
    total_findings: 1,
    policy_template: postureType,
    is_enabled_rules_score: isEnabledRulesScore,
    '@timestamp': '2023-11-22T16:10:55.229268215Z',
    score_by_cluster_id: {
      'Another Upper case account id': {
        total_findings: 1,
        passed_findings: 1,
        failed_findings: 0,
      },
      'Upper case cluster id': {
        total_findings: 1,
        passed_findings: 1,
        failed_findings: 0,
      },
    },
    score_by_benchmark_id: {
      cis_aws: {
        v1_5_0: {
          total_findings: 1,
          passed_findings: 1,
          failed_findings: 0,
        },
      },
      cis_k8s: {
        v1_0_0: {
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

export const cspmComplianceDashboardDataMockV1 = {
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
  trend: [
    {
      totalFindings: 1,
      totalFailed: 0,
      totalPassed: 1,
      postureScore: 100,
    },
  ],
};

export const cspmComplianceDashboardDataMockV2 = {
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

export const kspmComplianceDashboardDataMockV1 = {
  stats: {
    totalFailed: 0,
    totalPassed: 1,
    totalFindings: 1,
    postureScore: 100,
    resourcesEvaluated: 1,
  },
  groupedFindingsEvaluation: [
    {
      name: 'Upper case section',
      totalFindings: 1,
      totalFailed: 0,
      totalPassed: 1,
      postureScore: 100,
    },
  ],
  clusters: [
    {
      meta: {
        clusterId: 'Upper case cluster id',
        assetIdentifierId: 'Upper case cluster id',
        benchmark: {
          name: 'CIS Kubernetes V1.23',
          id: 'cis_k8s',
          posture_type: 'kspm',
          version: 'v1.0.0',
        },
        cluster: {
          id: 'Upper case cluster id',
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
          name: 'Upper case section',
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

export const kspmComplianceDashboardDataMockV2 = {
  stats: {
    totalFailed: 0,
    totalPassed: 1,
    totalFindings: 1,
    postureScore: 100,
    resourcesEvaluated: 1,
  },
  groupedFindingsEvaluation: [
    {
      name: 'Upper case section',
      totalFindings: 1,
      totalFailed: 0,
      totalPassed: 1,
      postureScore: 100,
    },
  ],
  benchmarks: [
    {
      meta: {
        benchmarkId: 'cis_k8s',
        benchmarkVersion: 'v1.0.0',
        benchmarkName: 'CIS Kubernetes V1.23',
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
          name: 'Upper case section',
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
