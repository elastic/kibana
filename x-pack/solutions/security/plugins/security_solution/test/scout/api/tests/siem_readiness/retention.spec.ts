/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, SIEM_READINESS_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

interface RetentionInfo {
  indexName: string;
  isDataStream: boolean;
  retentionType: 'ilm' | 'dsl' | null;
  retentionPeriod: string | null;
  retentionDays: number | null;
  policyName?: string | null;
  status: 'healthy' | 'non-compliant';
}

interface RetentionResponse {
  items: RetentionInfo[];
}

/**
 * SIEM Readiness API Tests: Retention Endpoint
 *
 * Tests for GET /api/siem_readiness/get_retention
 * This endpoint returns retention policy information for data streams and indices,
 * used by the Retention tab to show compliance status.
 */
apiTest.describe('SIEM Readiness - Retention API', { tag: SIEM_READINESS_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
  });

  apiTest('returns 200 with expected response structure', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_RETENTION, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as RetentionResponse;

    // Response must have items array
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
  });

  apiTest('retention items have required fields', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_RETENTION, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as RetentionResponse;

    // Each retention item should have expected structure
    body.items.forEach((item: RetentionInfo) => {
      // indexName is required
      expect(item.indexName).toBeDefined();
      expect(typeof item.indexName).toBe('string');

      // isDataStream is required
      expect(item.isDataStream).toBeDefined();
      expect(typeof item.isDataStream).toBe('boolean');

      // retentionType can be 'ilm', 'dsl', or null
      expect('retentionType' in item).toBe(true);
      if (item.retentionType !== null) {
        expect(['ilm', 'dsl']).toContain(item.retentionType);
      }

      // status is required and must be one of the expected values
      expect(item.status).toBeDefined();
      expect(['healthy', 'non-compliant']).toContain(item.status);
    });
  });

  apiTest('retention days are numeric or null', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_RETENTION, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as RetentionResponse;

    body.items.forEach((item: RetentionInfo) => {
      expect('retentionDays' in item).toBe(true);

      if (item.retentionDays !== null) {
        expect(typeof item.retentionDays).toBe('number');
        expect(item.retentionDays).toBeGreaterThanOrEqual(0);
      }
    });
  });

  apiTest('retention period is string or null', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_RETENTION, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as RetentionResponse;

    body.items.forEach((item: RetentionInfo) => {
      expect('retentionPeriod' in item).toBe(true);

      if (item.retentionPeriod !== null) {
        expect(typeof item.retentionPeriod).toBe('string');
      }
    });
  });

  apiTest('healthy status correlates with adequate retention', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_RETENTION, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as RetentionResponse;

    // Items with status 'healthy' should have either:
    // - No retention (null retentionDays means infinite)
    // - Retention >= 365 days (FedRAMP compliance threshold)
    body.items.forEach((item: RetentionInfo) => {
      if (item.status === 'healthy' && item.retentionDays !== null) {
        expect(item.retentionDays).toBeGreaterThanOrEqual(365);
      }

      if (item.status === 'non-compliant' && item.retentionDays !== null) {
        expect(item.retentionDays).toBeLessThan(365);
      }
    });
  });
});
