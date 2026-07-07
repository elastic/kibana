/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AggregationBuckets } from './findings_query_builders';
import {
  getVulnerabilitiesAggregationCount,
  VULNERABILITIES_RESULT_EVALUATION,
  createGetVulnerabilityFindingsQuery,
} from './findings_query_builders';

describe('getVulnerabilitiesAggregationCount', () => {
  it('should return default counts when nothing is provided', () => {
    const result = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 0,
    };
    expect(getVulnerabilitiesAggregationCount()).toEqual(result);
  });

  it('should return default counts when empty bucket is provided', () => {
    const result = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 0,
    };
    expect(getVulnerabilitiesAggregationCount({})).toEqual(result);
  });

  it('should return counts when provided with non empty buckets', () => {
    const buckets: AggregationBuckets = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: { doc_count: 1 },
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: { doc_count: 2 },
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: { doc_count: 3 },
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: { doc_count: 4 },
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: { doc_count: 5 },
    };

    const vulnerabilitiesAggregrationCount = getVulnerabilitiesAggregationCount(
      buckets as estypes.AggregationsBuckets<estypes.AggregationsStringRareTermsBucketKeys>
    );
    const result = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 1,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 2,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 3,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 4,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 5,
    };
    expect(vulnerabilitiesAggregrationCount).toEqual(result);
  });
});

describe('createGetVulnerabilityFindingsQuery', () => {
  it('should create query with all parameters defined', () => {
    const vulnerabilityId = 'CVE-2023-1234';
    const resourceId = 'resource-123';
    const packageName = 'package-abc';
    const packageVersion = '1.2.3';
    const eventId = 'event-456';

    const result = createGetVulnerabilityFindingsQuery(
      vulnerabilityId,
      resourceId,
      packageName,
      packageVersion,
      eventId
    );

    expect(result).toEqual({
      bool: {
        filter: [
          {
            terms: {
              'vulnerability.id': ['CVE-2023-1234'],
            },
          },
          {
            terms: {
              'resource.id': ['resource-123'],
            },
          },
          {
            terms: {
              'package.name': ['package-abc'],
            },
          },
          {
            terms: {
              'package.version': ['1.2.3'],
            },
          },
          {
            terms: {
              'event.id': ['event-456'],
            },
          },
        ],
        must_not: [],
      },
    });
  });

  it('should create query with undefined package.version and resource.id fields', () => {
    const vulnerabilityId = 'CVE-2023-1234';
    const packageName = 'package-abc';
    const eventId = 'event-456';

    const result = createGetVulnerabilityFindingsQuery(
      vulnerabilityId,
      undefined,
      packageName,
      undefined,
      eventId
    );

    expect(result).toEqual({
      bool: {
        filter: [
          {
            terms: {
              'vulnerability.id': ['CVE-2023-1234'],
            },
          },
          {
            terms: {
              'package.name': ['package-abc'],
            },
          },
          {
            terms: {
              'event.id': ['event-456'],
            },
          },
        ],
        must_not: [
          {
            exists: {
              field: 'resource.id',
            },
          },
          {
            exists: {
              field: 'package.version',
            },
          },
        ],
      },
    });
  });
});
