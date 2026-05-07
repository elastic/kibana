/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, SIEM_READINESS_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

interface IndexDocCount {
  index: string;
  docCount: number;
  exists: boolean;
  error?: string;
}

interface MitreDocCountsResponse {
  indices: IndexDocCount[];
}

/**
 * SIEM Readiness API Tests: MITRE Data Indices Doc Counts Endpoint
 *
 * Tests for POST /api/siem_readiness/mitre_data_indices_docs_count
 * This endpoint returns document counts for specified indices,
 * used by the Coverage tab to determine if rules have matching data.
 */
apiTest.describe('SIEM Readiness - MITRE Doc Counts API', { tag: SIEM_READINESS_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
  });

  apiTest('returns 200 with expected response structure', async ({ apiClient }) => {
    const response = await apiClient.post(SIEM_READINESS_ROUTES.MITRE_DOC_COUNTS, {
      headers: defaultHeaders,
      body: {
        indices: ['logs-*'],
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as MitreDocCountsResponse;

    // Response must have indices array
    expect(body.indices).toBeDefined();
    expect(Array.isArray(body.indices)).toBe(true);
  });

  apiTest('returns doc counts with correct structure for single index', async ({ apiClient }) => {
    const response = await apiClient.post(SIEM_READINESS_ROUTES.MITRE_DOC_COUNTS, {
      headers: defaultHeaders,
      body: {
        indices: ['logs-*'],
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as MitreDocCountsResponse;

    // Should have exactly one result for the requested index pattern
    expect(body.indices).toHaveLength(1);

    const [result] = body.indices;
    // Verify structure - field existence and types
    expect(result.index).toBe('logs-*');
    expect(result.docCount).toBeDefined();
    expect(result.exists).toBeDefined();

    expect(typeof result.index).toBe('string');
    expect(typeof result.docCount).toBe('number');
    expect(typeof result.exists).toBe('boolean');
    expect(result.docCount).toBeGreaterThanOrEqual(0);
  });

  apiTest('handles non-existent indices gracefully', async ({ apiClient }) => {
    const nonExistentIndex = 'non-existent-index-12345';

    const response = await apiClient.post(SIEM_READINESS_ROUTES.MITRE_DOC_COUNTS, {
      headers: defaultHeaders,
      body: {
        indices: [nonExistentIndex],
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as MitreDocCountsResponse;

    // Should have exactly one result for the requested index
    // API uses ignore_unavailable: true, so count succeeds with 0 docs
    expect(body.indices).toHaveLength(1);

    const [result] = body.indices;
    expect(result.index).toBe(nonExistentIndex);
    expect(result.exists).toBe(true);
    expect(result.docCount).toBe(0);
  });

  apiTest('handles multiple indices in single request', async ({ apiClient }) => {
    const indices = ['logs-*', 'metrics-*', 'non-existent-index'];

    const response = await apiClient.post(SIEM_READINESS_ROUTES.MITRE_DOC_COUNTS, {
      headers: defaultHeaders,
      body: { indices },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as MitreDocCountsResponse;

    // Should return results for all requested indices
    expect(body.indices).toHaveLength(indices.length);

    body.indices.forEach((result: IndexDocCount) => {
      expect(result.index).toBeDefined();
      expect(result.docCount).toBeDefined();
      expect(result.exists).toBeDefined();

      expect(typeof result.index).toBe('string');
      expect(typeof result.docCount).toBe('number');
      expect(typeof result.exists).toBe('boolean');
      expect(result.docCount).toBeGreaterThanOrEqual(0);
    });
  });

  apiTest('returns empty results for empty indices array', async ({ apiClient }) => {
    const response = await apiClient.post(SIEM_READINESS_ROUTES.MITRE_DOC_COUNTS, {
      headers: defaultHeaders,
      body: {
        indices: [],
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as MitreDocCountsResponse;

    // Should return empty indices array
    expect(body.indices).toStrictEqual([]);
  });

  apiTest('doc counts are non-negative integers', async ({ apiClient }) => {
    const response = await apiClient.post(SIEM_READINESS_ROUTES.MITRE_DOC_COUNTS, {
      headers: defaultHeaders,
      body: {
        indices: ['logs-*', 'metrics-*'],
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as MitreDocCountsResponse;

    body.indices.forEach((result: IndexDocCount) => {
      expect(Number.isInteger(result.docCount)).toBe(true);
      expect(result.docCount).toBeGreaterThanOrEqual(0);
    });
  });
});
