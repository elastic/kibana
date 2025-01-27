/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPostureStatsFromAggs, PostureStatsBucket } from './get_grouped_findings_evaluation';

const resourceTypeBuckets: PostureStatsBucket[] = [
  {
    key: 'foo_type',
    doc_count: 41,
    failed_findings: {
      doc_count: 30,
    },
    passed_findings: {
      doc_count: 11,
    },
    score: {
      value: 0.268,
    },
  },
  {
    key: 'boo_type',
    doc_count: 11,
    failed_findings: {
      doc_count: 5,
    },
    passed_findings: {
      doc_count: 6,
    },
    score: {
      value: 0.545,
    },
  },
];

describe('getPostureStatsFromAggs', () => {
  it('should return value matching ComplianceDashboardData["resourcesTypes"]', async () => {
    const resourceTypes = getPostureStatsFromAggs(resourceTypeBuckets);
    expect(resourceTypes).toEqual([
      {
        name: 'foo_type',
        totalFindings: 41,
        totalFailed: 30,
        totalPassed: 11,
        postureScore: 26.8,
      },
      {
        name: 'boo_type',
        totalFindings: 11,
        totalFailed: 5,
        totalPassed: 6,
        postureScore: 54.5,
      },
    ]);
  });
});
